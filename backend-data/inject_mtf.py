"""
Direct fix: inject the MTF attributes at the end of PineRuntime.__init__
"""
with open('pine_runner.py', 'r', encoding='utf-8') as f:
    src = f.read()

# Find the end of __init__ — it ends right before "    def begin_bar"
# We need to insert our MTF attributes before "    def begin_bar"
# Current state at end of __init__ (lines 177-180):
#         # Cache for computed columns (computed once per run)
#         self._ta_cache: Dict[str, Any] = {}
#
#
#     def request_security...

TARGET = "        # Cache for computed columns (computed once per run)\n        self._ta_cache: Dict[str, Any] = {}\n"
REPLACEMENT = """        # Cache for computed columns (computed once per run)
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
"""

if TARGET in src:
    src = src.replace(TARGET, REPLACEMENT, 1)
    print("OK: injected MTF attrs into __init__")
else:
    print("ERROR: target not found")
    # Debug
    idx = src.find("self._ta_cache: Dict[str, Any] = {}")
    if idx >= 0:
        print("Found _ta_cache at index", idx)
        print(repr(src[idx-5:idx+50]))

with open('pine_runner.py', 'w', encoding='utf-8') as f:
    f.write(src)
