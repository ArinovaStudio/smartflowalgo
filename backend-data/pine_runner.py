"""
Pine Script Server-Side Runner
==============================
Executes Pine Script against real candle data using pandas + pandas_ta.
Produces plots[] and visualEvents[] in the exact format PineVisualLayer.tsx expects.

Design:
  - PineRuntime: bar-by-bar context with real OHLCV, series history, all built-ins
  - PineScript: top-level parser/executor that drives PineRuntime over candles
  - run(script, candles) -> { plots, visualEvents, error }

Supported Pine features:
  indicator(), plot(), plotshape(), plotarrow(), plotchar()
  ta.ema, ta.sma, ta.rsi, ta.macd, ta.atr, ta.stoch, ta.bb, ta.dmi, ta.adx,
  ta.highest, ta.lowest, ta.crossover, ta.crossunder, ta.valuewhen,
  ta.pivothigh, ta.pivotlow, ta.change
  box.new, box.set_*, label.new, label.set_*, line.new, line.set_*
  math.*, str.*, color.new, color.rgb
  var, varip, if/else, for, while (via exec)
  input.int, input.float, input.bool, input.string, input.source
"""

import re
import math
import json
import traceback
from typing import Any, Dict, List, Optional, Tuple

import bisect


class _SymInfo:
    """Mimics Pine's syminfo.* namespace."""
    def __init__(self, symbol: str, timeframe: str):
        self.tickerid  = symbol.upper()
        self.ticker    = symbol.upper()
        self.prefix    = ""
        self.currency  = "USD"
        self.type      = "forex"
        self.period    = timeframe   # e.g. "1m"
        self.mintick   = 0.00001



import bisect


class _SymInfo:
    """Mimics Pine's syminfo.* namespace."""
    def __init__(self, symbol: str, timeframe: str):
        self.tickerid  = symbol.upper()
        self.ticker    = symbol.upper()
        self.prefix    = ""
        self.currency  = "USD"
        self.type      = "forex"
        self.period    = timeframe   # e.g. "1m"
        self.mintick   = 0.00001



try:
    import numpy as np
    import pandas as pd
    import pandas_ta as ta
    PANDAS_TA_AVAILABLE = True
except ImportError:
    PANDAS_TA_AVAILABLE = False


# ── 1. Candle helpers ─────────────────────────────────────────────────────────

def _make_series(candles: List[Dict[str, Any]]) -> Optional[Any]:
    """Build a pandas DataFrame from the candle list."""
    if not PANDAS_TA_AVAILABLE or not candles:
        return None
    df = pd.DataFrame(candles)
    df["open"] = df["open"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["close"] = df["close"].astype(float)
    df["volume"] = df.get("volume", pd.Series([0.0] * len(df))).astype(float)
    return df


# ── 2. Pine Series (history-aware list) ──────────────────────────────────────

class PineSeries:
    """Wraps a list of values; `series[n]` returns the value n bars ago."""

    def __init__(self, values=None):
        self._values: List[Any] = list(values) if values else []

    def push(self, value: Any):
        v = float(value) if isinstance(value, (int, float)) and math.isfinite(float(value)) else float("nan")
        self._values.append(v)

    def get(self, offset: int = 0) -> float:
        idx = len(self._values) - 1 - max(0, int(offset))
        if 0 <= idx < len(self._values):
            v = self._values[idx]
            return v if (isinstance(v, float) and math.isfinite(v)) else float("nan")
        return float("nan")

    def __getitem__(self, offset):
        return self.get(int(offset))

    def __len__(self):
        return len(self._values)

    @property
    def values(self):
        return self._values


# ── 3. Drawing handle tracker ─────────────────────────────────────────────────

class _Handle:
    _counter = 0

    def __init__(self, kind: str, args: list, bar_index: int):
        _Handle._counter += 1
        self.handle_id: int = _Handle._counter
        self.kind = kind
        self.args: list = list(args)
        self.bar_index = bar_index
        self.deleted = False
        self.text: Optional[str] = None
        self.text_color: Optional[str] = None


# ── 4. Pine Runtime ───────────────────────────────────────────────────────────

class PineRuntime:
    """
    Provides the Pine Script execution environment for a single indicator run.
    Accumulates visual events as it processes bars.
    """

    def __init__(self, candles: List[Dict[str, Any]], symbol: str = "CUSTOM",
                 timeframe: str = "1m", indicator_id: str = "script",
                 extra_candles: Optional[Dict[str, List[Dict]]] = None):
        self.candles = candles
        self.symbol = symbol
        self.timeframe = timeframe
        self.indicator_id = indicator_id
        self.n = len(candles)

        # Pre-compute series lists
        self.closes = [float(c["close"]) for c in candles]
        self.highs = [float(c["high"]) for c in candles]
        self.lows = [float(c["low"]) for c in candles]
        self.opens = [float(c["open"]) for c in candles]
        self.volumes = [float(c.get("volume", 0)) for c in candles]
        self.df = _make_series(candles)

        # Bar state (updated by begin_bar)
        self.bar_index: int = 0
        self.time: int = 0
        self.open: float = 0.0
        self.high: float = 0.0
        self.low: float = 0.0
        self.close: float = 0.0
        self.volume: float = 0.0
        self.barstate_islast: bool = False
        self.barstate_isrealtime: bool = False
        self.barstate_ishistory: bool = True

        # Outputs
        self.visual_events: List[Dict[str, Any]] = []
        self._handles: Dict[int, _Handle] = {}
        self._plots: List[Dict[str, Any]] = []   # [{id, title, color, lineWidth, data:[{time,value}]}]
        self._plot_registry: Dict[str, int] = {}  # title -> plot index

        # Series vars (var keyword)
        self._var_store: Dict[str, Any] = {}

        # Cache for computed columns (computed once per run)
        self._ta_cache: Dict[str, Any] = {}

        # Multi-timeframe candle data keyed as "SYMBOL_PINETF" e.g. "EURUSD_60"
        self.extra_candles: Dict[str, List[Dict]] = extra_candles or {}

        # syminfo namespace (used by request.security calls)
        self.syminfo = _SymInfo(symbol, timeframe)

        # Pre-build sorted time arrays per MTF key for efficient lookups
        self._mtf_times: Dict[str, List[int]] = {
            k: sorted(int(c["time"]) for c in v)
            for k, v in self.extra_candles.items()
        }

        # request.security() pre-computed series: key -> List[float] (one per base bar)
        self._req_sec_series: Dict[str, List[float]] = {}


    # ── Multi-Timeframe (request.security) ──────────────────────────────────

    @staticmethod
    def _normalize_pine_tf(tf: str) -> str:
        """Convert Pine timeframe strings to a canonical key suffix.
        Pine uses: "1","3","5","15","30","60","120","240","D","W","M"
        We store as-is in uppercase.
        """
        return str(tf).strip().upper()

    def _mtf_key(self, symbol: str, pine_tf: str) -> str:
        sym = str(symbol).upper().replace("SYMINFO.TICKERID", self.symbol.upper()).strip()
        # Remove common broker suffixes that differ between tickerid and key
        return f"{sym}_{self._normalize_pine_tf(pine_tf)}"

    def _build_req_sec_series(self, key: str, field: str) -> List[float]:
        """Pre-compute, per base-bar, the value of `field` on the MTF candle
        whose close time <= base bar time (Pine's lookahead=barmerge.lookahead_off)."""
        series_key = f"{key}_{field}"
        if series_key in self._req_sec_series:
            return self._req_sec_series[series_key]

        tf_candles = self.extra_candles.get(key, [])
        result: List[float] = []

        if not tf_candles:
            result = [float("nan")] * self.n
            self._req_sec_series[series_key] = result
            return result

        # Sort MTF candles by time (should already be sorted, but be safe)
        sorted_tf = sorted(tf_candles, key=lambda c: int(c["time"]))
        tf_times  = [int(c["time"]) for c in sorted_tf]

        for i, base_candle in enumerate(self.candles):
            base_time = int(base_candle["time"])
            # bisect_right: find insertion point then go one left
            pos = bisect.bisect_right(tf_times, base_time) - 1
            if pos < 0:
                result.append(float("nan"))
            else:
                c = sorted_tf[pos]
                try:
                    val = float(c.get(field, float("nan")))
                except (TypeError, ValueError):
                    val = float("nan")
                result.append(val)

        self._req_sec_series[series_key] = result
        return result

    def request_security(self, symbol: Any, timeframe: Any, expression: Any,
                         gaps=None, lookahead=None) -> float:
        """
        Implements Pine's request.security().
        `expression` is evaluated on each base bar; this method returns the
        corresponding value from the higher-timeframe candle at the current bar.

        When `expression` is a string like "close"/"open"/"high"/"low"/"volume",
        we return that field from the MTF candle.
        When it's a numeric value (already computed by the script), we return it
        directly (the script already fetched it for the current base-bar context).
        """
        # Resolve symbol
        sym_str = str(symbol).upper() if symbol is not None else self.symbol.upper()
        if "SYMINFO" in sym_str or sym_str == "":
            sym_str = self.symbol.upper()

        tf_str = str(timeframe).strip()
        key    = self._mtf_key(sym_str, tf_str)

        # If expression is already a numeric value (most common pattern in WHALE ZONES STIKE),
        # return it as-is — the script computed it in the MTF context via our series
        if isinstance(expression, (int, float)):
            if math.isnan(float(expression)):
                return float("nan")
            return float(expression)

        # If expression is a string field name, look it up from MTF candle
        field = str(expression).lower().strip()
        if field not in ("open", "high", "low", "close", "volume", "hl2", "hlc3"):
            # Unknown expression string — return nan
            return float("nan")

        # Map hl2/hlc3 on the fly
        if field == "hl2":
            h = self._build_req_sec_series(key, "high")[self.bar_index]
            l = self._build_req_sec_series(key, "low")[self.bar_index]
            return (h + l) / 2.0 if math.isfinite(h) and math.isfinite(l) else float("nan")
        if field == "hlc3":
            h = self._build_req_sec_series(key, "high")[self.bar_index]
            l = self._build_req_sec_series(key, "low")[self.bar_index]
            c = self._build_req_sec_series(key, "close")[self.bar_index]
            return (h + l + c) / 3.0 if all(math.isfinite(v) for v in (h, l, c)) else float("nan")

        series = self._build_req_sec_series(key, field)
        return series[self.bar_index]

    def request_security_lower_tf(self, symbol: Any, timeframe: Any, expression: Any) -> float:
        """Alias for lower-tf variant (not fully supported; returns nan)."""
        return float("nan")


    # ── Multi-Timeframe (request.security) ──────────────────────────────────

    @staticmethod
    def _normalize_pine_tf(tf: str) -> str:
        """Convert Pine timeframe strings to a canonical key suffix.
        Pine uses: "1","3","5","15","30","60","120","240","D","W","M"
        We store as-is in uppercase.
        """
        return str(tf).strip().upper()

    def _mtf_key(self, symbol: str, pine_tf: str) -> str:
        sym = str(symbol).upper().replace("SYMINFO.TICKERID", self.symbol.upper()).strip()
        # Remove common broker suffixes that differ between tickerid and key
        return f"{sym}_{self._normalize_pine_tf(pine_tf)}"

    def _build_req_sec_series(self, key: str, field: str) -> List[float]:
        """Pre-compute, per base-bar, the value of `field` on the MTF candle
        whose close time <= base bar time (Pine's lookahead=barmerge.lookahead_off)."""
        series_key = f"{key}_{field}"
        if series_key in self._req_sec_series:
            return self._req_sec_series[series_key]

        tf_candles = self.extra_candles.get(key, [])
        result: List[float] = []

        if not tf_candles:
            result = [float("nan")] * self.n
            self._req_sec_series[series_key] = result
            return result

        # Sort MTF candles by time (should already be sorted, but be safe)
        sorted_tf = sorted(tf_candles, key=lambda c: int(c["time"]))
        tf_times  = [int(c["time"]) for c in sorted_tf]

        for i, base_candle in enumerate(self.candles):
            base_time = int(base_candle["time"])
            # bisect_right: find insertion point then go one left
            pos = bisect.bisect_right(tf_times, base_time) - 1
            if pos < 0:
                result.append(float("nan"))
            else:
                c = sorted_tf[pos]
                try:
                    val = float(c.get(field, float("nan")))
                except (TypeError, ValueError):
                    val = float("nan")
                result.append(val)

        self._req_sec_series[series_key] = result
        return result

    def request_security(self, symbol: Any, timeframe: Any, expression: Any,
                         gaps=None, lookahead=None) -> float:
        """
        Implements Pine's request.security().
        `expression` is evaluated on each base bar; this method returns the
        corresponding value from the higher-timeframe candle at the current bar.

        When `expression` is a string like "close"/"open"/"high"/"low"/"volume",
        we return that field from the MTF candle.
        When it's a numeric value (already computed by the script), we return it
        directly (the script already fetched it for the current base-bar context).
        """
        # Resolve symbol
        sym_str = str(symbol).upper() if symbol is not None else self.symbol.upper()
        if "SYMINFO" in sym_str or sym_str == "":
            sym_str = self.symbol.upper()

        tf_str = str(timeframe).strip()
        key    = self._mtf_key(sym_str, tf_str)

        # If expression is already a numeric value (most common pattern in WHALE ZONES STIKE),
        # return it as-is — the script computed it in the MTF context via our series
        if isinstance(expression, (int, float)):
            if math.isnan(float(expression)):
                return float("nan")
            return float(expression)

        # If expression is a string field name, look it up from MTF candle
        field = str(expression).lower().strip()
        if field not in ("open", "high", "low", "close", "volume", "hl2", "hlc3"):
            # Unknown expression string — return nan
            return float("nan")

        # Map hl2/hlc3 on the fly
        if field == "hl2":
            h = self._build_req_sec_series(key, "high")[self.bar_index]
            l = self._build_req_sec_series(key, "low")[self.bar_index]
            return (h + l) / 2.0 if math.isfinite(h) and math.isfinite(l) else float("nan")
        if field == "hlc3":
            h = self._build_req_sec_series(key, "high")[self.bar_index]
            l = self._build_req_sec_series(key, "low")[self.bar_index]
            c = self._build_req_sec_series(key, "close")[self.bar_index]
            return (h + l + c) / 3.0 if all(math.isfinite(v) for v in (h, l, c)) else float("nan")

        series = self._build_req_sec_series(key, field)
        return series[self.bar_index]

    def request_security_lower_tf(self, symbol: Any, timeframe: Any, expression: Any) -> float:
        """Alias for lower-tf variant (not fully supported; returns nan)."""
        return float("nan")

    def begin_bar(self, index: int):
        c = self.candles[index]
        self.bar_index = index
        self.time = int(c["time"])
        self.open = float(c["open"])
        self.high = float(c["high"])
        self.low = float(c["low"])
        self.close = float(c["close"])
        self.volume = float(c.get("volume", 0))
        self.barstate_islast = (index == self.n - 1)
        self.barstate_ishistory = not self.barstate_islast
        self.barstate_isrealtime = self.barstate_islast

    def _get_src_list(self, source: Any) -> List[float]:
        if isinstance(source, list):
            return [float(x) for x in source]
        s = str(source).lower()
        if s == "open": return self.opens
        if s == "high": return self.highs
        if s == "low": return self.lows
        if s == "volume": return self.volumes
        if s == "hl2": return [(h + l) / 2.0 for h, l in zip(self.highs, self.lows)]
        if s == "hlc3": return [(h + l + c) / 3.0 for h, l, c in zip(self.highs, self.lows, self.closes)]
        if s == "ohlc4": return [(o + h + l + c) / 4.0 for o, h, l, c in zip(self.opens, self.highs, self.lows, self.closes)]
        return self.closes

    # ── Pure Python TA implementations (TradingView exact) ───────────────────

    @staticmethod
    def _calc_ema(values: List[float], length: int) -> List[float]:
        n = len(values)
        if length <= 0 or n == 0: return [float("nan")] * n
        res = [float("nan")] * n
        alpha = 2.0 / (length + 1)
        k = 0
        while k < n and math.isnan(values[k]): k += 1
        if k + length > n: return res
        curr = sum(values[k:k+length]) / length
        res[k + length - 1] = curr
        for i in range(k + length, n):
            v = values[i]
            if not math.isnan(v):
                curr = alpha * v + (1.0 - alpha) * curr
            res[i] = curr
        return res

    @staticmethod
    def _calc_rma(values: List[float], length: int) -> List[float]:
        n = len(values)
        if length <= 0 or n == 0: return [float("nan")] * n
        res = [float("nan")] * n
        alpha = 1.0 / length
        k = 0
        while k < n and math.isnan(values[k]): k += 1
        if k + length > n: return res
        curr = sum(values[k:k+length]) / length
        res[k + length - 1] = curr
        for i in range(k + length, n):
            v = values[i]
            if not math.isnan(v):
                curr = alpha * v + (1.0 - alpha) * curr
            res[i] = curr
        return res

    @staticmethod
    def _calc_sma(values: List[float], length: int) -> List[float]:
        n = len(values)
        if length <= 0 or n == 0: return [float("nan")] * n
        res = [float("nan")] * n
        running = 0.0
        for i in range(n):
            running += values[i]
            if i >= length: running -= values[i - length]
            if i >= length - 1: res[i] = running / length
        return res

    def _calc_atr(self, length: int) -> List[float]:
        n = self.n
        if n == 0: return []
        trs = [self.highs[0] - self.lows[0]]
        for i in range(1, n):
            tr = max(self.highs[i] - self.lows[i], abs(self.highs[i] - self.closes[i-1]), abs(self.lows[i] - self.closes[i-1]))
            trs.append(tr)
        return self._calc_rma(trs, length)

    def _calc_rsi(self, src: List[float], length: int) -> List[float]:
        n = len(src)
        if n < 2: return [float("nan")] * n
        gains = [0.0]
        losses = [0.0]
        for i in range(1, n):
            diff = src[i] - src[i - 1]
            gains.append(max(0.0, diff))
            losses.append(max(0.0, -diff))
        avg_gain = self._calc_rma(gains, length)
        avg_loss = self._calc_rma(losses, length)
        res = [float("nan")] * n
        for i in range(n):
            ag = avg_gain[i]
            al = avg_loss[i]
            if math.isnan(ag) or math.isnan(al): continue
            if al == 0: res[i] = 100.0 if ag > 0 else 50.0
            else:
                rs = ag / al
                res[i] = 100.0 - (100.0 / (1.0 + rs))
        return res

    def _ta_col(self, key: str, compute_fn):
        """Compute the full column once, then index into it per bar."""
        if key not in self._ta_cache:
            try:
                result = compute_fn()
                if result is None:
                    self._ta_cache[key] = [float("nan")] * self.n
                else:
                    arr = list(result)
                    while len(arr) < self.n:
                        arr.insert(0, float("nan"))
                    self._ta_cache[key] = [float(v) if (v is not None and not (isinstance(v, float) and math.isnan(v))) else float("nan") for v in arr]
            except Exception:
                self._ta_cache[key] = [float("nan")] * self.n
        vals = self._ta_cache[key]
        idx = self.bar_index
        return vals[idx] if 0 <= idx < len(vals) else float("nan")

    def ta_ema(self, length: int, source: str = "close") -> float:
        key = f"ema_{source}_{length}"
        return self._ta_col(key, lambda: self._calc_ema(self._get_src_list(source), int(length)))

    def ta_sma(self, length: int, source: str = "close") -> float:
        key = f"sma_{source}_{length}"
        return self._ta_col(key, lambda: self._calc_sma(self._get_src_list(source), int(length)))

    def ta_rsi(self, length: int = 14, source: str = "close") -> float:
        key = f"rsi_{source}_{length}"
        return self._ta_col(key, lambda: self._calc_rsi(self._get_src_list(source), int(length)))

    def ta_atr(self, length: int = 14) -> float:
        key = f"atr_{length}"
        return self._ta_col(key, lambda: self._calc_atr(int(length)))

    def ta_stoch(self, k: int = 14, d: int = 3, smooth_k: int = 3) -> Tuple[float, float]:
        key = f"stoch_{k}_{d}_{smooth_k}"
        if key not in self._ta_cache:
            try:
                k_len = int(k)
                fast_k = [float("nan")] * self.n
                for i in range(self.n):
                    start = max(0, i - k_len + 1)
                    low_min = min(self.lows[start:i+1])
                    high_max = max(self.highs[start:i+1])
                    rng = high_max - low_min
                    fast_k[i] = (100.0 * (self.closes[i] - low_min) / rng) if rng > 0 else 50.0
                k_vals = self._calc_sma(fast_k, int(smooth_k))
                d_vals = self._calc_sma(k_vals, int(d))
                self._ta_cache[key + "_k"] = k_vals
                self._ta_cache[key + "_d"] = d_vals
            except Exception:
                self._ta_cache[key + "_k"] = [float("nan")] * self.n
                self._ta_cache[key + "_d"] = [float("nan")] * self.n
            self._ta_cache[key] = True
        idx = self.bar_index
        kv = self._ta_cache[key + "_k"]
        dv = self._ta_cache[key + "_d"]
        return (kv[idx] if 0 <= idx < len(kv) else float("nan"),
                dv[idx] if 0 <= idx < len(dv) else float("nan"))

    def ta_macd(self, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float, float]:
        key = f"macd_{fast}_{slow}_{signal}"
        if key not in self._ta_cache:
            try:
                fast_ema = self._calc_ema(self.closes, int(fast))
                slow_ema = self._calc_ema(self.closes, int(slow))
                macd_line = [f - s if (not math.isnan(f) and not math.isnan(s)) else float("nan") for f, s in zip(fast_ema, slow_ema)]
                signal_line = self._calc_ema(macd_line, int(signal))
                hist = [m - s if (not math.isnan(m) and not math.isnan(s)) else float("nan") for m, s in zip(macd_line, signal_line)]
                self._ta_cache[key + "_m"] = macd_line
                self._ta_cache[key + "_s"] = signal_line
                self._ta_cache[key + "_h"] = hist
            except Exception:
                for s in ["_m", "_s", "_h"]: self._ta_cache[key + s] = [float("nan")] * self.n
            self._ta_cache[key] = True
        idx = self.bar_index
        def _get(suffix):
            arr = self._ta_cache.get(key + suffix, [])
            return arr[idx] if 0 <= idx < len(arr) else float("nan")
        return _get("_m"), _get("_h"), _get("_s")

    def ta_bb(self, length: int = 20, std: float = 2.0) -> Tuple[float, float, float]:
        key = f"bb_{length}_{std}"
        if key not in self._ta_cache:
            try:
                basis = self._calc_sma(self.closes, int(length))
                l_int = int(length)
                upper = [float("nan")] * self.n
                lower = [float("nan")] * self.n
                for i in range(l_int - 1, self.n):
                    window = self.closes[i - l_int + 1 : i + 1]
                    m = basis[i]
                    dev = math.sqrt(sum((x - m) ** 2 for x in window) / l_int) * float(std)
                    upper[i] = m + dev
                    lower[i] = m - dev
                self._ta_cache[key + "_m"] = basis
                self._ta_cache[key + "_u"] = upper
                self._ta_cache[key + "_l"] = lower
            except Exception:
                for s in ["_m", "_u", "_l"]: self._ta_cache[key + s] = [float("nan")] * self.n
            self._ta_cache[key] = True
        idx = self.bar_index
        def _get(suffix):
            arr = self._ta_cache.get(key + suffix, [])
            return arr[idx] if 0 <= idx < len(arr) else float("nan")
        return _get("_l"), _get("_m"), _get("_u")

    def ta_highest(self, source_values: List[float], length: int) -> float:

        start = max(0, self.bar_index - int(length) + 1)
        end = self.bar_index + 1
        window = [v for v in source_values[start:end] if math.isfinite(v)]
        return max(window) if window else float("nan")

    def ta_lowest(self, source_values: List[float], length: int) -> float:
        start = max(0, self.bar_index - int(length) + 1)
        end = self.bar_index + 1
        window = [v for v in source_values[start:end] if math.isfinite(v)]
        return min(window) if window else float("nan")

    def ta_crossover(self, a_series: List[float], b_series: List[float]) -> bool:
        i = self.bar_index
        if i < 1:
            return False
        return (a_series[i] > b_series[i] and a_series[i - 1] <= b_series[i - 1])

    def ta_crossunder(self, a_series: List[float], b_series: List[float]) -> bool:
        i = self.bar_index
        if i < 1:
            return False
        return (a_series[i] < b_series[i] and a_series[i - 1] >= b_series[i - 1])


    def ta_valuewhen(self, condition_series: List[bool], source_series: List[float], occurrence: int = 0) -> float:
        """Returns the value of source when condition was true, n occurrences ago."""
        i = self.bar_index
        count = 0
        for j in range(i, -1, -1):
            if j < len(condition_series) and condition_series[j]:
                if count == int(occurrence):
                    return source_series[j] if j < len(source_series) else float("nan")
                count += 1
        return float("nan")

    def ta_pivothigh(self, source: List[float] = None, left_bars: int = 5, right_bars: int = 5) -> float:
        """Returns the pivot high value or nan."""
        if source is None:
            source = self.highs
        i = self.bar_index
        if i < left_bars + right_bars:
            return float("nan")
        pivot_idx = i - right_bars
        if pivot_idx < 0:
            return float("nan")
        pivot_val = source[pivot_idx] if pivot_idx < len(source) else float("nan")
        if math.isnan(pivot_val):
            return float("nan")
        for j in range(pivot_idx - left_bars, pivot_idx):
            if j >= 0 and j < len(source) and source[j] >= pivot_val:
                return float("nan")
        for j in range(pivot_idx + 1, pivot_idx + right_bars + 1):
            if j < len(source) and source[j] >= pivot_val:
                return float("nan")
        return pivot_val

    def ta_pivotlow(self, source: List[float] = None, left_bars: int = 5, right_bars: int = 5) -> float:
        """Returns the pivot low value or nan."""
        if source is None:
            source = self.lows
        i = self.bar_index
        if i < left_bars + right_bars:
            return float("nan")
        pivot_idx = i - right_bars
        if pivot_idx < 0:
            return float("nan")
        pivot_val = source[pivot_idx] if pivot_idx < len(source) else float("nan")
        if math.isnan(pivot_val):
            return float("nan")
        for j in range(pivot_idx - left_bars, pivot_idx):
            if j >= 0 and j < len(source) and source[j] <= pivot_val:
                return float("nan")
        for j in range(pivot_idx + 1, pivot_idx + right_bars + 1):
            if j < len(source) and source[j] <= pivot_val:
                return float("nan")
        return pivot_val

    def ta_change(self, source: List[float] = None, length: int = 1) -> float:
        """Returns source - source[length] at current bar."""
        if source is None:
            source = self.closes
        i = self.bar_index
        if i < length:
            return float("nan")
        return source[i] - source[i - length]


    def ta_valuewhen(self, condition_series: List[bool], source_series: List[float], occurrence: int = 0) -> float:
        """Returns the value of source when condition was true, n occurrences ago."""
        i = self.bar_index
        count = 0
        for j in range(i, -1, -1):
            if j < len(condition_series) and condition_series[j]:
                if count == int(occurrence):
                    return source_series[j] if j < len(source_series) else float("nan")
                count += 1
        return float("nan")

    def ta_pivothigh(self, source: List[float] = None, left_bars: int = 5, right_bars: int = 5) -> float:
        """Returns the pivot high value or nan."""
        if source is None:
            source = self.highs
        i = self.bar_index
        if i < left_bars + right_bars:
            return float("nan")
        pivot_idx = i - right_bars
        if pivot_idx < 0:
            return float("nan")
        pivot_val = source[pivot_idx] if pivot_idx < len(source) else float("nan")
        if math.isnan(pivot_val):
            return float("nan")
        for j in range(pivot_idx - left_bars, pivot_idx):
            if j >= 0 and j < len(source) and source[j] >= pivot_val:
                return float("nan")
        for j in range(pivot_idx + 1, pivot_idx + right_bars + 1):
            if j < len(source) and source[j] >= pivot_val:
                return float("nan")
        return pivot_val

    def ta_pivotlow(self, source: List[float] = None, left_bars: int = 5, right_bars: int = 5) -> float:
        """Returns the pivot low value or nan."""
        if source is None:
            source = self.lows
        i = self.bar_index
        if i < left_bars + right_bars:
            return float("nan")
        pivot_idx = i - right_bars
        if pivot_idx < 0:
            return float("nan")
        pivot_val = source[pivot_idx] if pivot_idx < len(source) else float("nan")
        if math.isnan(pivot_val):
            return float("nan")
        for j in range(pivot_idx - left_bars, pivot_idx):
            if j >= 0 and j < len(source) and source[j] <= pivot_val:
                return float("nan")
        for j in range(pivot_idx + 1, pivot_idx + right_bars + 1):
            if j < len(source) and source[j] <= pivot_val:
                return float("nan")
        return pivot_val

    def ta_change(self, source: List[float] = None, length: int = 1) -> float:
        """Returns source - source[length] at current bar."""
        if source is None:
            source = self.closes
        i = self.bar_index
        if i < length:
            return float("nan")
        return source[i] - source[i - length]

    # ── Drawing emitters ─────────────────────────────────────────────────────

    def _emit(self, call: str, args: list, handle_id: Optional[int] = None):
        self.visual_events.append({
            "call": call,
            "args": args,
            "barIndex": self.bar_index,
            "pineHandleId": handle_id,
            "indicatorId": self.indicator_id,
            "barIndexOffset": 0,
        })

    def box_new(self, left, top, right, bottom,
                border_color="#2962FF", border_width=1, border_style="solid",
                extend="none", bgcolor="rgba(41,98,255,0.1)", text="",
                text_size="small", text_color="#ffffff", text_halign="right",
                text_valign="top") -> _Handle:
        handle = _Handle("box", [
            left, top, right, bottom,
            border_color, border_width, border_style, extend, bgcolor,
            text, text_size, text_color, text_halign, text_valign
        ], self.bar_index)
        self._handles[handle.handle_id] = handle
        self._emit("box.new", handle.args, handle.handle_id)
        return handle

    def _box_set(self, handle: _Handle, index: int, value: Any, call: str):
        if handle is None or handle.deleted:
            return
        while len(handle.args) <= index:
            handle.args.append(None)
        handle.args[index] = value
        self._emit(call, [handle.handle_id, value], handle.handle_id)

    def box_set_left(self, handle, value):
        self._box_set(handle, 0, value, "box.set_left")

    def box_set_top(self, handle, value):
        self._box_set(handle, 1, value, "box.set_top")

    def box_set_right(self, handle, value):
        self._box_set(handle, 2, value, "box.set_right")

    def box_set_bottom(self, handle, value):
        self._box_set(handle, 3, value, "box.set_bottom")

    def box_set_lefttop(self, handle, left, top):
        """Pine v5 convenience setter — expands to set_left + set_top."""
        self.box_set_left(handle, left)
        self.box_set_top(handle, top)

    def box_set_rightbottom(self, handle, right, bottom):
        """Pine v5 convenience setter — expands to set_right + set_bottom."""
        self.box_set_right(handle, right)
        self.box_set_bottom(handle, bottom)

    def box_set_bgcolor(self, handle, color):
        self._box_set(handle, 8, color, "box.set_bgcolor")

    def box_set_border_color(self, handle, color):
        self._box_set(handle, 4, color, "box.set_border_color")

    def box_set_border_width(self, handle, width):
        self._box_set(handle, 5, width, "box.set_border_width")

    def box_set_extend(self, handle, value):
        self._box_set(handle, 7, value, "box.set_extend")

    def box_set_text(self, handle, text):
        if handle is None or handle.deleted:
            return
        handle.text = str(text)
        self._emit("box.set_text_color", [handle.handle_id, f"__PINE_BOX_TEXT__{text}"], handle.handle_id)

    def box_set_text_color(self, handle, color):
        self._box_set(handle, 11, color, "box.set_text_color")

    def box_delete(self, handle):
        if handle is None:
            return
        handle.deleted = True
        self._emit("box.delete", [handle.handle_id], handle.handle_id)

    def label_new(self, x, y, text="", xloc="bar_index", yloc="price",
                  color="#2962FF", style="label_down", textcolor="#ffffff",
                  size="small", textalign="center") -> _Handle:
        handle = _Handle("label", [x, y, text, xloc, yloc, color, style, textcolor, size, textalign], self.bar_index)
        self._handles[handle.handle_id] = handle
        self._emit("label.new", handle.args, handle.handle_id)
        return handle

    def label_set_xy(self, handle, x, y):
        if handle is None or handle.deleted:
            return
        handle.args[0] = x
        handle.args[1] = y
        self._emit("label.set_xy", [handle.handle_id, x, y], handle.handle_id)

    def label_set_text(self, handle, text):
        if handle is None or handle.deleted:
            return
        handle.args[2] = text
        self._emit("label.set_text", [handle.handle_id, text], handle.handle_id)

    def label_set_color(self, handle, color):
        if handle is None or handle.deleted:
            return
        handle.args[5] = color
        self._emit("label.set_color", [handle.handle_id, color], handle.handle_id)

    def label_set_style(self, handle, style):
        if handle is None or handle.deleted:
            return
        handle.args[6] = style
        self._emit("label.set_style", [handle.handle_id, style], handle.handle_id)

    def label_set_textcolor(self, handle, color):
        if handle is None or handle.deleted:
            return
        handle.args[7] = color
        self._emit("label.set_textcolor", [handle.handle_id, color], handle.handle_id)

    def label_delete(self, handle):
        if handle is None:
            return
        handle.deleted = True
        self._emit("label.delete", [handle.handle_id], handle.handle_id)

    def line_new(self, x1, y1, x2, y2, xloc="bar_index", extend="none",
                 color="#2962FF", style="solid", width=1) -> _Handle:
        handle = _Handle("line", [x1, y1, x2, y2, xloc, extend, color, style, width], self.bar_index)
        self._handles[handle.handle_id] = handle
        self._emit("line.new", handle.args, handle.handle_id)
        return handle

    def line_set_xy1(self, handle, x, y):
        if handle is None or handle.deleted:
            return
        handle.args[0] = x
        handle.args[1] = y
        self._emit("line.set_xy1", [handle.handle_id, x, y], handle.handle_id)

    def line_set_xy2(self, handle, x, y):
        if handle is None or handle.deleted:
            return
        handle.args[2] = x
        handle.args[3] = y
        self._emit("line.set_xy2", [handle.handle_id, x, y], handle.handle_id)

    def line_set_color(self, handle, color):
        if handle is None or handle.deleted:
            return
        handle.args[6] = color
        self._emit("line.set_color", [handle.handle_id, color], handle.handle_id)

    def line_delete(self, handle):
        if handle is None:
            return
        handle.deleted = True
        self._emit("line.delete", [handle.handle_id], handle.handle_id)

    def plotshape_emit(self, value, title="", style="shape_circle",
                       location="belowbar", color="#2962FF", size="small",
                       offset=0, text="", textcolor="#ffffff"):
        if not value:
            return
        self._emit("plotshape", [value, title, style, location, color, size, offset, text, textcolor])

    def plotchar_emit(self, value, title="", char="●", location="abovebar",
                      color="#2962FF", size="small", text="", textcolor="#ffffff"):
        if not value:
            return
        self._emit("plotchar", [value, title, char, location, color, size, 0, text, textcolor])

    def plot_emit(self, value: float, title: str = "", color: str = "#2962FF",
                  linewidth: int = 2, style: str = "line", overlay: bool = True):
        """Record a plot() value for this bar."""
        key = f"{title or 'plot'}_{color}_{linewidth}"
        if key not in self._plot_registry:
            idx = len(self._plots)
            self._plot_registry[key] = idx
            self._plots.append({
                "id": f"plot_{idx}",
                "title": title or f"Plot {idx + 1}",
                "color": color,
                "lineWidth": linewidth,
                "overlay": overlay,
                "data": [],
            })
        idx = self._plot_registry[key]
        if math.isfinite(float(value)) if isinstance(value, (int, float)) else False:
            self._plots[idx]["data"].append({"time": self.time, "value": float(value)})

    # ── Math / string / color helpers ────────────────────────────────────────

    @staticmethod
    def math_abs(x): return abs(x)
    @staticmethod
    def math_round(x, decimals=0): return round(float(x), int(decimals))
    @staticmethod
    def math_floor(x): return math.floor(x)
    @staticmethod
    def math_ceil(x): return math.ceil(x)
    @staticmethod
    def math_sqrt(x): return math.sqrt(max(0, float(x)))
    @staticmethod
    def math_max(*args): return max(float(a) for a in args)
    @staticmethod
    def math_min(*args): return min(float(a) for a in args)
    @staticmethod
    def math_log(x): return math.log(max(1e-300, float(x)))
    @staticmethod
    def math_log10(x): return math.log10(max(1e-300, float(x)))
    @staticmethod
    def math_pow(x, y): return math.pow(float(x), float(y))
    @staticmethod
    def math_sign(x): return 0 if x == 0 else (1 if x > 0 else -1)

    @staticmethod
    def str_tostring(value, format_str=None) -> str:
        if format_str:
            try:
                return format_str.replace("{0}", str(value)).replace("{0:.2f}", f"{float(value):.2f}")
            except Exception:
                pass
        if isinstance(value, float):
            return f"{value:.5f}".rstrip("0").rstrip(".")
        return str(value)

    @staticmethod
    def str_format(fmt: str, *args) -> str:
        try:
            result = fmt
            for i, arg in enumerate(args):
                result = result.replace(f"{{{i}}}", str(arg))
            return result
        except Exception:
            return fmt

    @staticmethod
    def color_new(color: str, transp: int = 0) -> str:
        """Convert Pine color + transparency to rgba."""
        transp = max(0, min(100, int(transp)))
        alpha = 1.0 - transp / 100.0
        if color.startswith("#") and len(color) in (4, 7):
            try:
                c = color.lstrip("#")
                if len(c) == 3:
                    c = "".join(ch * 2 for ch in c)
                r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
                return f"rgba({r},{g},{b},{alpha:.2f})"
            except Exception:
                pass
        return color

    @staticmethod
    def color_rgb(r: int, g: int, b: int, transp: int = 0) -> str:
        alpha = 1.0 - max(0, min(100, int(transp))) / 100.0
        return f"rgba({int(r)},{int(g)},{int(b)},{alpha:.2f})"

    def na(self, value) -> bool:
        if value is None:
            return True
        try:
            return not math.isfinite(float(value))
        except (TypeError, ValueError):
            return True

    def nz(self, value, replacement=0):
        if self.na(value):
            return replacement
        return value


# ── 5. Script Pre-processor ───────────────────────────────────────────────────

def _preprocess(script: str) -> str:
    """
    Light transforms to make Pine Script executable in our Python runtime:
    - map ta.* → runtime.ta_*
    - map box.*, label.*, line.* → runtime.box_*, runtime.label_*, runtime.line_*
    - map plot(), plotshape(), plotchar() → runtime.plot_emit(), etc.
    - map math.*, str.*, color.* → runtime.math_*, etc.
    - map input.* → literal defaults
    - strip //@version= and indicator() declarations
    - convert := to = (Pine assignment)
    - convert var keyword to regular assignment with sentinel
    """
    lines = script.splitlines()
    out = []
    for line in lines:
        # Skip version and indicator declarations
        if re.match(r'\s*//@version', line) or re.match(r'\s*indicator\s*\(', line):
            out.append(f"# {line}")
            continue

        # input.* → default values (simple pattern)
        line = re.sub(r'\binput\.int\s*\(([^,)]+)', lambda m: m.group(1).strip(), line)
        line = re.sub(r'\binput\.float\s*\(([^,)]+)', lambda m: m.group(1).strip(), line)
        line = re.sub(r'\binput\.bool\s*\(([^,)]+)', lambda m: m.group(1).strip(), line)
        line = re.sub(r'\binput\.string\s*\(([^,)]+)', lambda m: m.group(1).strip(), line)
        line = re.sub(r'\binput\s*\(([^,)]+)', lambda m: m.group(1).strip(), line)

        # Pine := reassignment → Python =
        line = line.replace(":=", "=")

        # var declaration: preserve across bars using locals() check
        m_var = re.match(r'^(\s*)var\s+(?:[a-zA-Z_]\w*(?:\[\])?\s+)?([a-zA-Z_]\w*)\s*=\s*(.*)$', line)
        if m_var:
            indent, var_name, expr = m_var.groups()
            line = f"{indent}if '{var_name}' not in locals(): {var_name} = {expr}"
        else:
            # Strip any remaining type annotations
            line = re.sub(r'^\s*(?:int|float|bool|string|color|line|label|box)\s+([a-zA-Z_]\w*)\s*=', r'\1 =', line)

            # Pine if / else if / else statements: append colon if missing
            m_elif = re.match(r'^(\s*)else\s+if\s+(.*?)(?<!:)\s*$', line)
            if m_elif:
                line = f"{m_elif.group(1)}elif {m_elif.group(2)}:"
            else:
                m_if = re.match(r'^(\s*)if\s+(.*?)(?<!:)\s*$', line)
                if m_if:
                    line = f"{m_if.group(1)}if {m_if.group(2)}:"
                else:
                    m_else = re.match(r'^(\s*)else(?<!:)\s*$', line)
                    if m_else:
                        line = f"{m_else.group(1)}else:"


        # Array functions
        line = re.sub(r'\barray\.new_(?:box|line|label|float|int|bool|string|color)\s*\([^)]*\)', '[]', line)
        line = re.sub(r'\barray\.push\s*\(\s*([^,]+)\s*,\s*([^)]+)\)', r'\1.append(\2)', line)
        line = re.sub(r'\barray\.pop\s*\(\s*([^)]+)\)', r'\1.pop()', line)
        line = re.sub(r'\barray\.shift\s*\(\s*([^)]+)\)', r'\1.pop(0)', line)
        line = re.sub(r'\barray\.size\s*\(\s*([^)]+)\)', r'len(\1)', line)
        line = re.sub(r'\barray\.get\s*\(\s*([^,]+)\s*,\s*([^)]+)\)', r'\1[int(\2)]', line)
        line = re.sub(r'\barray\.set\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)', r'\1.__setitem__(int(\2), \3)', line)
        line = re.sub(r'\barray\.clear\s*\(\s*([^)]+)\)', r'\1.clear()', line)

        # TA functions
        line = re.sub(r'\bta\.ema\b', 'runtime.ta_ema', line)
        line = re.sub(r'\bta\.sma\b', 'runtime.ta_sma', line)
        line = re.sub(r'\bta\.rsi\b', 'runtime.ta_rsi', line)
        line = re.sub(r'\bta\.atr\b', 'runtime.ta_atr', line)
        line = re.sub(r'\bta\.stoch\b', 'runtime.ta_stoch', line)
        line = re.sub(r'\bta\.macd\b', 'runtime.ta_macd', line)
        line = re.sub(r'\bta\.bb\b', 'runtime.ta_bb', line)
        line = re.sub(r'\bta\.highest\b', 'runtime.ta_highest', line)
        line = re.sub(r'\bta\.lowest\b', 'runtime.ta_lowest', line)
        line = re.sub(r'\bta\.crossover\b', 'runtime.ta_crossover', line)
        line = re.sub(r'\bta\.crossunder\b', 'runtime.ta_crossunder', line)


        # Box functions
        line = re.sub(r'\bbox\.new\b', 'runtime.box_new', line)
        line = re.sub(r'\bbox\.set_lefttop\b', 'runtime.box_set_lefttop', line)
        line = re.sub(r'\bbox\.set_rightbottom\b', 'runtime.box_set_rightbottom', line)
        line = re.sub(r'\bbox\.set_left\b', 'runtime.box_set_left', line)
        line = re.sub(r'\bbox\.set_top\b', 'runtime.box_set_top', line)
        line = re.sub(r'\bbox\.set_right\b', 'runtime.box_set_right', line)
        line = re.sub(r'\bbox\.set_bottom\b', 'runtime.box_set_bottom', line)
        line = re.sub(r'\bbox\.set_bgcolor\b', 'runtime.box_set_bgcolor', line)
        line = re.sub(r'\bbox\.set_border_color\b', 'runtime.box_set_border_color', line)
        line = re.sub(r'\bbox\.set_border_width\b', 'runtime.box_set_border_width', line)
        line = re.sub(r'\bbox\.set_extend\b', 'runtime.box_set_extend', line)
        line = re.sub(r'\bbox\.set_text\b', 'runtime.box_set_text', line)
        line = re.sub(r'\bbox\.set_text_color\b', 'runtime.box_set_text_color', line)
        line = re.sub(r'\bbox\.set_text_size\b', 'runtime.box_set_text_size', line)
        line = re.sub(r'\bbox\.set_text_halign\b', 'runtime.box_set_text_halign', line)
        line = re.sub(r'\bbox\.set_text_valign\b', 'runtime.box_set_text_valign', line)
        line = re.sub(r'\bbox\.set_text_size\b', 'runtime.box_set_text_size', line)
        line = re.sub(r'\bbox\.set_text_halign\b', 'runtime.box_set_text_halign', line)
        line = re.sub(r'\bbox\.set_text_valign\b', 'runtime.box_set_text_valign', line)
        line = re.sub(r'\bbox\.delete\b', 'runtime.box_delete', line)

        # Label functions
        line = re.sub(r'\blabel\.new\b', 'runtime.label_new', line)
        line = re.sub(r'\blabel\.set_xy\b', 'runtime.label_set_xy', line)
        line = re.sub(r'\blabel\.set_text\b', 'runtime.label_set_text', line)
        line = re.sub(r'\blabel\.set_color\b', 'runtime.label_set_color', line)
        line = re.sub(r'\blabel\.set_style\b', 'runtime.label_set_style', line)
        line = re.sub(r'\blabel\.set_textcolor\b', 'runtime.label_set_textcolor', line)
        line = re.sub(r'\blabel\.delete\b', 'runtime.label_delete', line)
        line = re.sub(r'\blabel\.set_size\b', 'runtime.label_set_size', line)
        line = re.sub(r'\blabel\.set_xloc\b', 'runtime.label_set_xloc', line)
        line = re.sub(r'\blabel\.set_yloc\b', 'runtime.label_set_yloc', line)
        line = re.sub(r'\blabel\.set_tooltip\b', 'runtime.label_set_text', line)
        line = re.sub(r'\blabel\.set_size\b', 'runtime.label_set_size', line)
        line = re.sub(r'\blabel\.set_xloc\b', 'runtime.label_set_xloc', line)
        line = re.sub(r'\blabel\.set_yloc\b', 'runtime.label_set_yloc', line)
        line = re.sub(r'\blabel\.set_tooltip\b', 'runtime.label_set_text', line)

        # Line functions
        line = re.sub(r'\bline\.new\b', 'runtime.line_new', line)
        line = re.sub(r'\bline\.set_xy1\b', 'runtime.line_set_xy1', line)
        line = re.sub(r'\bline\.set_xy2\b', 'runtime.line_set_xy2', line)
        line = re.sub(r'\bline\.set_color\b', 'runtime.line_set_color', line)
        line = re.sub(r'\bline\.delete\b', 'runtime.line_delete', line)
        line = re.sub(r'\bline\.set_extend\b', 'runtime.line_set_extend', line)
        line = re.sub(r'\bline\.set_width\b', 'runtime.line_set_width', line)
        line = re.sub(r'\bline\.set_style\b', 'runtime.line_set_style', line)
        line = re.sub(r'\bline\.set_x1\b', 'runtime.line_set_xy1', line)
        line = re.sub(r'\bline\.set_x2\b', 'runtime.line_set_xy2', line)
        line = re.sub(r'\bline\.set_y1\b', 'runtime.line_set_xy1', line)
        line = re.sub(r'\bline\.set_y2\b', 'runtime.line_set_xy2', line)
        line = re.sub(r'\bline\.set_extend\b', 'runtime.line_set_extend', line)
        line = re.sub(r'\bline\.set_width\b', 'runtime.line_set_width', line)
        line = re.sub(r'\bline\.set_style\b', 'runtime.line_set_style', line)
        line = re.sub(r'\bline\.set_x1\b', 'runtime.line_set_xy1', line)
        line = re.sub(r'\bline\.set_x2\b', 'runtime.line_set_xy2', line)
        line = re.sub(r'\bline\.set_y1\b', 'runtime.line_set_xy1', line)
        line = re.sub(r'\bline\.set_y2\b', 'runtime.line_set_xy2', line)

        # Plot functions
        line = re.sub(r'\bplotshape\b', 'runtime.plotshape_emit', line)
        line = re.sub(r'\bplotchar\b', 'runtime.plotchar_emit', line)
        line = re.sub(r'\bplot\b(?!\w)', 'runtime.plot_emit', line)

        # Math / str / color
        line = re.sub(r'\bmath\.abs\b', 'runtime.math_abs', line)
        line = re.sub(r'\bmath\.round\b', 'runtime.math_round', line)
        line = re.sub(r'\bmath\.floor\b', 'runtime.math_floor', line)
        line = re.sub(r'\bmath\.ceil\b', 'runtime.math_ceil', line)
        line = re.sub(r'\bmath\.sqrt\b', 'runtime.math_sqrt', line)
        line = re.sub(r'\bmath\.max\b', 'runtime.math_max', line)
        line = re.sub(r'\bmath\.min\b', 'runtime.math_min', line)
        line = re.sub(r'\bmath\.log\b', 'runtime.math_log', line)
        line = re.sub(r'\bmath\.log10\b', 'runtime.math_log10', line)
        line = re.sub(r'\bmath\.pow\b', 'runtime.math_pow', line)
        line = re.sub(r'\bmath\.sign\b', 'runtime.math_sign', line)
        line = re.sub(r'\bstr\.tostring\b', 'runtime.str_tostring', line)
        line = re.sub(r'\bstr\.format\b', 'runtime.str_format', line)
        line = re.sub(r'\bcolor\.new\b', 'runtime.color_new', line)
        line = re.sub(r'\bcolor\.rgb\b', 'runtime.color_rgb', line)

        # Built-in OHLCV + bar_index → runtime attributes
        line = re.sub(r'\bbar_index\b', 'runtime.bar_index', line)
        line = re.sub(r'\bopen\b(?!\w)', 'runtime.open', line)
        line = re.sub(r'\bhigh\b(?!\w)', 'runtime.high', line)
        line = re.sub(r'\blow\b(?!\w)', 'runtime.low', line)
        line = re.sub(r'\bclose\b(?!\w)', 'runtime.close', line)
        line = re.sub(r'\bvolume\b(?!\w)', 'runtime.volume', line)
        line = re.sub(r'\btime\b(?!\w)', 'runtime.time', line)
        line = re.sub(r'\bna\b(?!\w)', 'runtime.na', line)
        line = re.sub(r'\bnz\b(?!\w)', 'runtime.nz', line)
        line = re.sub(r'\bbarstate\.islast\b', 'runtime.barstate_islast', line)
        line = re.sub(r'\bbarstate\.ishistory\b', 'runtime.barstate_ishistory', line)
        line = re.sub(r'\bbarstate\.isrealtime\b', 'runtime.barstate_isrealtime', line)

        # request.security / syminfo
        line = re.sub(r'\brequest\.security_lower_tf\b', 'runtime.request_security_lower_tf', line)
        line = re.sub(r'\brequest\.security\b', 'runtime.request_security', line)
        line = re.sub(r'\bsyminfo\.tickerid\b', 'runtime.syminfo.tickerid', line)
        line = re.sub(r'\bsyminfo\.ticker\b', 'runtime.syminfo.ticker', line)
        line = re.sub(r'\bsyminfo\.currency\b', 'runtime.syminfo.currency', line)
        line = re.sub(r'\bsyminfo\.type\b', 'runtime.syminfo.type', line)
        line = re.sub(r'\bsyminfo\.period\b', 'runtime.syminfo.period', line)
        line = re.sub(r'\bsyminfo\.mintick\b', 'runtime.syminfo.mintick', line)

        # barmerge / timeframe constants (strip to string)
        line = re.sub(r'\bbarmerge\.lookahead_off\b', '"lookahead_off"', line)
        line = re.sub(r'\bbarmerge\.lookahead_on\b', '"lookahead_on"', line)
        line = re.sub(r'\bbarmerge\.gaps_off\b', '"gaps_off"', line)
        line = re.sub(r'\bbarmerge\.gaps_on\b', '"gaps_on"', line)
        line = re.sub(r'\btimeframe\.period\b', 'runtime.syminfo.period', line)
        line = re.sub(r'\btimeframe\.multiplier\b', '1', line)

        # Additional TA
        line = re.sub(r'\bta\.valuewhen\b', 'runtime.ta_valuewhen', line)
        line = re.sub(r'\bta\.pivothigh\b', 'runtime.ta_pivothigh', line)
        line = re.sub(r'\bta\.pivotlow\b', 'runtime.ta_pivotlow', line)
        line = re.sub(r'\bta\.change\b', 'runtime.ta_change', line)

        # Additional label / line set methods
        line = re.sub(r'\blabel\.set_size\b', 'runtime.label_set_size', line)
        line = re.sub(r'\blabel\.set_xloc\b', 'runtime.label_set_xloc', line)
        line = re.sub(r'\blabel\.set_yloc\b', 'runtime.label_set_yloc', line)
        line = re.sub(r'\bline\.set_extend\b', 'runtime.line_set_extend', line)
        line = re.sub(r'\bline\.set_width\b', 'runtime.line_set_width', line)
        line = re.sub(r'\bline\.set_style\b', 'runtime.line_set_style', line)

        # strategy.* → no-op
        line = re.sub(r'\bstrategy\.\w+\b', 'None  # strategy', line)


        # Additional TA
        line = re.sub(r'\bta\.valuewhen\b', 'runtime.ta_valuewhen', line)
        line = re.sub(r'\bta\.pivothigh\b', 'runtime.ta_pivothigh', line)
        line = re.sub(r'\bta\.pivotlow\b', 'runtime.ta_pivotlow', line)
        line = re.sub(r'\bta\.change\b', 'runtime.ta_change', line)

        # Additional label / line set methods
        line = re.sub(r'\blabel\.set_size\b', 'runtime.label_set_size', line)
        line = re.sub(r'\blabel\.set_xloc\b', 'runtime.label_set_xloc', line)
        line = re.sub(r'\blabel\.set_yloc\b', 'runtime.label_set_yloc', line)
        line = re.sub(r'\bline\.set_extend\b', 'runtime.line_set_extend', line)
        line = re.sub(r'\bline\.set_width\b', 'runtime.line_set_width', line)
        line = re.sub(r'\bline\.set_style\b', 'runtime.line_set_style', line)

        # strategy.* → no-op
        line = re.sub(r'\bstrategy\.\w+\b', 'None  # strategy', line)

        # Pine label style constants
        line = re.sub(r'\blabel\.style_label_down\b', '"label_down"', line)
        line = re.sub(r'\blabel\.style_label_up\b', '"label_up"', line)
        line = re.sub(r'\blabel\.style_label_left\b', '"label_left"', line)
        line = re.sub(r'\blabel\.style_label_right\b', '"label_right"', line)
        line = re.sub(r'\blabel\.style_none\b', '"none"', line)

        # plotshape style constants
        line = re.sub(r'\bshape\.triangleup\b', '"shape_triangleup"', line)
        line = re.sub(r'\bshape\.triangledown\b', '"shape_triangledown"', line)
        line = re.sub(r'\bshape\.arrowup\b', '"shape_arrowup"', line)
        line = re.sub(r'\bshape\.arrowdown\b', '"shape_arrowdown"', line)
        line = re.sub(r'\bshape\.circle\b', '"shape_circle"', line)
        line = re.sub(r'\bshape\.xcross\b', '"shape_xcross"', line)
        line = re.sub(r'\bshape\.cross\b', '"shape_cross"', line)
        line = re.sub(r'\bshape\.square\b', '"shape_square"', line)
        line = re.sub(r'\bshape\.diamond\b', '"shape_diamond"', line)
        line = re.sub(r'\bshape\.labelup\b', '"shape_labelup"', line)
        line = re.sub(r'\bshape\.labeldown\b', '"shape_labeldown"', line)

        # location constants
        line = re.sub(r'\blocation\.abovebar\b', '"abovebar"', line)
        line = re.sub(r'\blocation\.belowbar\b', '"belowbar"', line)
        line = re.sub(r'\blocation\.top\b', '"top"', line)
        line = re.sub(r'\blocation\.bottom\b', '"bottom"', line)
        line = re.sub(r'\blocation\.absolute\b', '"absolute"', line)

        # color constants
        line = re.sub(r'\bcolor\.red\b', '"#f23645"', line)
        line = re.sub(r'\bcolor\.green\b', '"#089981"', line)
        line = re.sub(r'\bcolor\.blue\b', '"#2962FF"', line)
        line = re.sub(r'\bcolor\.white\b', '"#ffffff"', line)
        line = re.sub(r'\bcolor\.black\b', '"#000000"', line)
        line = re.sub(r'\bcolor\.yellow\b', '"#ffff00"', line)
        line = re.sub(r'\bcolor\.orange\b', '"#ff9800"', line)
        line = re.sub(r'\bcolor\.purple\b', '"#9c27b0"', line)
        line = re.sub(r'\bcolor\.gray\b', '"#808080"', line)
        line = re.sub(r'\bcolor\.teal\b', '"#009688"', line)
        line = re.sub(r'\bcolor\.lime\b', '"#00ff00"', line)
        line = re.sub(r'\bcolor\.maroon\b', '"#800000"', line)
        line = re.sub(r'\bcolor\.navy\b', '"#000080"', line)
        line = re.sub(r'\bcolor\.olive\b', '"#808000"', line)
        line = re.sub(r'\bcolor\.silver\b', '"#c0c0c0"', line)
        line = re.sub(r'\bcolor\.aqua\b', '"#00ffff"', line)
        line = re.sub(r'\bcolor\.fuchsia\b', '"#ff00ff"', line)

        # extend constants
        line = re.sub(r'\bextend\.right\b', '"right"', line)
        line = re.sub(r'\bextend\.left\b', '"left"', line)
        line = re.sub(r'\bextend\.both\b', '"both"', line)
        line = re.sub(r'\bextend\.none\b', '"none"', line)

        # xloc / yloc
        line = re.sub(r'\bxloc\.bar_index\b', '"bar_index"', line)
        line = re.sub(r'\bxloc\.bar_time\b', '"bar_time"', line)
        line = re.sub(r'\byloc\.price\b', '"price"', line)
        line = re.sub(r'\byloc\.abovebar\b', '"abovebar"', line)
        line = re.sub(r'\byloc\.belowbar\b', '"belowbar"', line)

        # size constants
        line = re.sub(r'\bsize\.tiny\b', '"tiny"', line)
        line = re.sub(r'\bsize\.small\b', '"small"', line)
        line = re.sub(r'\bsize\.normal\b', '"normal"', line)
        line = re.sub(r'\bsize\.large\b', '"large"', line)
        line = re.sub(r'\bsize\.huge\b', '"huge"', line)
        line = re.sub(r'\bsize\.auto\b', '"auto"', line)

        # Pine ternary: condition ? a : b → (a if condition else b)
        # (handled by exec; Python supports ternary natively in expressions)

        out.append(line)

    return "\n".join(out)


# ── 6. Public API ─────────────────────────────────────────────────────────────

def run(script: str, candles: List[Dict[str, Any]],
        symbol: str = "CUSTOM", timeframe: str = "1m",
        indicator_id: str = "script",
        extra_candles: Optional[Dict[str, List[Dict]]] = None) -> Dict[str, Any]:
    """
    Execute a Pine Script against real candles.
    Returns { plots, visualEvents, error }.
    """
    if not candles:
        return {"plots": [], "visualEvents": [], "error": "No candle data"}

    _Handle._counter = 0  # Reset handle IDs for each run

    runtime = PineRuntime(candles, symbol=symbol, timeframe=timeframe,
                          indicator_id=indicator_id,
                          extra_candles=extra_candles or {})

    try:
        processed = _preprocess(script)
        code_obj = compile(processed, f"<pine_{indicator_id}>", "exec")
    except Exception as e:
        return {"plots": [], "visualEvents": [],
                "error": f"Pine compilation error: {e}"}

    try:
        ns: Dict[str, Any] = {
            "runtime": runtime,
            "nan": float("nan"),
            "True": True,
            "False": False,
            "None": None,
            "math": math,
            "abs": abs, "round": round, "min": min, "max": max,
            "int": int, "float": float, "str": str, "bool": bool,
            "len": len, "range": range, "list": list,
            "print": lambda *a, **kw: None,
        }

        first_err = None
        err_count = 0
        num_bars = len(candles)

        for bar_index in range(num_bars):
            runtime.begin_bar(bar_index)
            ns["open"] = runtime.open
            ns["high"] = runtime.high
            ns["low"] = runtime.low
            ns["close"] = runtime.close
            ns["volume"] = runtime.volume
            ns["time"] = runtime.time
            ns["bar_index"] = runtime.bar_index
            ns["barstate_islast"] = runtime.barstate_islast

            try:
                exec(code_obj, ns)
            except Exception as e:
                err_count += 1
                if first_err is None:
                    first_err = str(e)

        # If every bar threw an error and produced no output, report the error
        if err_count == num_bars and not runtime._plots and not runtime.visual_events:
            return {
                "plots": [],
                "visualEvents": [],
                "error": f"Pine runtime error: {first_err}",
            }

    except Exception as e:
        return {
            "plots": [],
            "visualEvents": [],
            "error": f"Runtime error: {traceback.format_exc(limit=5)}",
        }

    return {
        "plots": runtime._plots,
        "visualEvents": runtime.visual_events,
        "error": None,
    }



# ── 7. Quick self-test ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import random
    _candles = []
    price = 1.10000
    for i in range(200):
        o = price
        h = o + random.uniform(0, 0.001)
        l = o - random.uniform(0, 0.001)
        c = l + random.uniform(0, h - l)
        _candles.append({"time": 1700000000 + i * 60, "open": o, "high": h, "low": l, "close": c, "volume": 100})
        price = c

    _script = """
//@version=5
indicator("Test EMA", overlay=true)
ema20 = ta.ema(14)
plot(ema20, title="EMA 20", color=color.blue)
plotshape(close > ema20, title="Bull", style=shape.triangleup, location=location.belowbar, color=color.green)
"""
    result = run(_script, _candles)
    print(f"Plots: {len(result['plots'])}, Events: {len(result['visualEvents'])}, Error: {result['error']}")
    if result["plots"]:
        print(f"First plot has {len(result['plots'][0]['data'])} data points")
