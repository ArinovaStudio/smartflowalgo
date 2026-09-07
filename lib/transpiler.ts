/**
 * SmartFlowAlgo Pine Script Transpiler & Execution Engine
 * Evaluates Pine Script (v4/v5/v6) & Technical Analysis algorithms
 * client-side and outputs lightweight-charts series & markers.
 */

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPlotLine {
  id: string;
  title: string;
  color: string;
  lineWidth?: number;
  style?: "line" | "histogram" | "cross" | "area";
  overlay: boolean;
  data: Array<{ time: number; value: number; color?: string }>;
}

export interface IndicatorMarker {
  time: number;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  text?: string;
  size?: number;
}

export interface IndicatorHLine {
  price: number;
  title?: string;
  color?: string;
  lineStyle?: "solid" | "dotted" | "dashed";
}

export interface TranspiledIndicatorOutput {
  name: string;
  shortTitle?: string;
  overlay: boolean;
  plots: IndicatorPlotLine[];
  markers: IndicatorMarker[];
  hlines: IndicatorHLine[];
  inputs: Record<string, any>;
  error?: string;
}

// ==========================================
// 1. Technical Analysis Library (ta.*)
// ==========================================

export class TechnicalAnalysis {
  static sma(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0) return result;
    let sum = 0;
    for (let i = 0; i < source.length; i++) {
      sum += source[i];
      if (i >= length) {
        sum -= source[i - length];
      }
      if (i >= length - 1) {
        result[i] = sum / length;
      }
    }
    return result;
  }

  static ema(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0 || source.length === 0) return result;
    const alpha = 2 / (length + 1);

    let sum = 0;
    for (let i = 0; i < Math.min(length, source.length); i++) {
      sum += source[i];
    }
    let prevEma = sum / Math.min(length, source.length);
    result[Math.min(length - 1, source.length - 1)] = prevEma;

    for (let i = length; i < source.length; i++) {
      prevEma = alpha * source[i] + (1 - alpha) * prevEma;
      result[i] = prevEma;
    }
    return result;
  }

  static rma(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0 || source.length === 0) return result;
    const alpha = 1 / length;

    let sum = 0;
    for (let i = 0; i < Math.min(length, source.length); i++) {
      sum += source[i];
    }
    let prevRma = sum / Math.min(length, source.length);
    result[Math.min(length - 1, source.length - 1)] = prevRma;

    for (let i = length; i < source.length; i++) {
      prevRma = alpha * source[i] + (1 - alpha) * prevRma;
      result[i] = prevRma;
    }
    return result;
  }

  static wma(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0) return result;
    const norm = (length * (length + 1)) / 2;

    for (let i = length - 1; i < source.length; i++) {
      let sum = 0;
      for (let j = 0; j < length; j++) {
        sum += source[i - j] * (length - j);
      }
      result[i] = sum / norm;
    }
    return result;
  }

  static vwma(source: number[], volume: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0) return result;

    for (let i = length - 1; i < source.length; i++) {
      let sumSrcVol = 0;
      let sumVol = 0;
      for (let j = 0; j < length; j++) {
        const v = volume[i - j] || 1;
        sumSrcVol += source[i - j] * v;
        sumVol += v;
      }
      result[i] = sumVol > 0 ? sumSrcVol / sumVol : null;
    }
    return result;
  }

  static tr(high: number[], low: number[], close: number[]): number[] {
    const result: number[] = new Array(high.length).fill(0);
    result[0] = high[0] - low[0];
    for (let i = 1; i < high.length; i++) {
      const hl = high[i] - low[i];
      const hc = Math.abs(high[i] - close[i - 1]);
      const lc = Math.abs(low[i] - close[i - 1]);
      result[i] = Math.max(hl, hc, lc);
    }
    return result;
  }

  static atr(high: number[], low: number[], close: number[], length: number): (number | null)[] {
    const trueRange = TechnicalAnalysis.tr(high, low, close);
    return TechnicalAnalysis.rma(trueRange, length);
  }

  static rsi(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (length <= 0 || source.length <= length) return result;

    const gains: number[] = new Array(source.length).fill(0);
    const losses: number[] = new Array(source.length).fill(0);

    for (let i = 1; i < source.length; i++) {
      const change = source[i] - source[i - 1];
      if (change > 0) gains[i] = change;
      else losses[i] = Math.abs(change);
    }

    const avgGain = TechnicalAnalysis.rma(gains, length);
    const avgLoss = TechnicalAnalysis.rma(losses, length);

    for (let i = length; i < source.length; i++) {
      const g = avgGain[i] ?? 0;
      const l = avgLoss[i] ?? 0;
      if (l === 0) {
        result[i] = 100;
      } else if (g === 0) {
        result[i] = 0;
      } else {
        const rs = g / l;
        result[i] = 100 - 100 / (1 + rs);
      }
    }
    return result;
  }

  static macd(
    source: number[],
    fastLength = 12,
    slowLength = 26,
    signalLength = 9
  ): {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  } {
    const fastEma = TechnicalAnalysis.ema(source, fastLength);
    const slowEma = TechnicalAnalysis.ema(source, slowLength);
    const macdLine: (number | null)[] = new Array(source.length).fill(null);

    const validMacdValues: number[] = [];
    const validMacdIndices: number[] = [];

    for (let i = 0; i < source.length; i++) {
      if (fastEma[i] !== null && slowEma[i] !== null) {
        const val = (fastEma[i] as number) - (slowEma[i] as number);
        macdLine[i] = val;
        validMacdValues.push(val);
        validMacdIndices.push(i);
      }
    }

    const signalRaw = TechnicalAnalysis.ema(validMacdValues, signalLength);
    const signalLine: (number | null)[] = new Array(source.length).fill(null);
    const histogram: (number | null)[] = new Array(source.length).fill(null);

    for (let k = 0; k < validMacdIndices.length; k++) {
      const originalIdx = validMacdIndices[k];
      const sig = signalRaw[k];
      signalLine[originalIdx] = sig;
      if (macdLine[originalIdx] !== null && sig !== null) {
        histogram[originalIdx] = (macdLine[originalIdx] as number) - sig;
      }
    }

    return { macd: macdLine, signal: signalLine, histogram };
  }

  static bollingerBands(
    source: number[],
    length = 20,
    mult = 2
  ): {
    middle: (number | null)[];
    upper: (number | null)[];
    lower: (number | null)[];
  } {
    const middle = TechnicalAnalysis.sma(source, length);
    const upper: (number | null)[] = new Array(source.length).fill(null);
    const lower: (number | null)[] = new Array(source.length).fill(null);

    for (let i = length - 1; i < source.length; i++) {
      const mean = middle[i];
      if (mean !== null) {
        let sumSqDiff = 0;
        for (let j = 0; j < length; j++) {
          const diff = source[i - j] - mean;
          sumSqDiff += diff * diff;
        }
        const stdev = Math.sqrt(sumSqDiff / length);
        upper[i] = mean + mult * stdev;
        lower[i] = mean - mult * stdev;
      }
    }

    return { middle, upper, lower };
  }

  static supertrend(
    high: number[],
    low: number[],
    close: number[],
    factor = 3,
    atrPeriod = 10
  ): {
    superTrend: (number | null)[];
    direction: number[];
    buySignals: boolean[];
    sellSignals: boolean[];
  } {
    const len = high.length;
    const atr = TechnicalAnalysis.atr(high, low, close, atrPeriod);

    const superTrend: (number | null)[] = new Array(len).fill(null);
    const direction: number[] = new Array(len).fill(1);
    const buySignals: boolean[] = new Array(len).fill(false);
    const sellSignals: boolean[] = new Array(len).fill(false);

    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevSupertrend = 0;
    let prevDir = 1;

    for (let i = atrPeriod; i < len; i++) {
      const currentAtr = atr[i] || 0;
      const hl2 = (high[i] + low[i]) / 2;

      let upperBand = hl2 + factor * currentAtr;
      let lowerBand = hl2 - factor * currentAtr;

      if (i > atrPeriod) {
        if (lowerBand > prevLowerBand || close[i - 1] < prevLowerBand) {
          // Keep lowerBand
        } else {
          lowerBand = prevLowerBand;
        }

        if (upperBand < prevUpperBand || close[i - 1] > prevUpperBand) {
          // Keep upperBand
        } else {
          upperBand = prevUpperBand;
        }
      }

      let currentDir = prevDir;
      if (prevSupertrend === prevUpperBand) {
        currentDir = close[i] > upperBand ? 1 : -1;
      } else {
        currentDir = close[i] < lowerBand ? -1 : 1;
      }

      const currentSupertrend = currentDir === 1 ? lowerBand : upperBand;

      superTrend[i] = currentSupertrend;
      direction[i] = currentDir;

      if (currentDir === 1 && prevDir === -1) {
        buySignals[i] = true;
      } else if (currentDir === -1 && prevDir === 1) {
        sellSignals[i] = true;
      }

      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
      prevSupertrend = currentSupertrend;
      prevDir = currentDir;
    }

    return { superTrend, direction, buySignals, sellSignals };
  }

  static crossover(series1: (number | null)[], series2: (number | null)[]): boolean[] {
    const result: boolean[] = new Array(series1.length).fill(false);
    for (let i = 1; i < series1.length; i++) {
      const s1Prev = series1[i - 1];
      const s1Curr = series1[i];
      const s2Prev = series2[i - 1];
      const s2Curr = series2[i];
      if (
        s1Prev !== null &&
        s1Curr !== null &&
        s2Prev !== null &&
        s2Curr !== null
      ) {
        if (s1Prev <= s2Prev && s1Curr > s2Curr) {
          result[i] = true;
        }
      }
    }
    return result;
  }

  static crossunder(series1: (number | null)[], series2: (number | null)[]): boolean[] {
    const result: boolean[] = new Array(series1.length).fill(false);
    for (let i = 1; i < series1.length; i++) {
      const s1Prev = series1[i - 1];
      const s1Curr = series1[i];
      const s2Prev = series2[i - 1];
      const s2Curr = series2[i];
      if (
        s1Prev !== null &&
        s1Curr !== null &&
        s2Prev !== null &&
        s2Curr !== null
      ) {
        if (s1Prev >= s2Prev && s1Curr < s2Curr) {
          result[i] = true;
        }
      }
    }
    return result;
  }

  static highest(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    for (let i = length - 1; i < source.length; i++) {
      let maxVal = -Infinity;
      for (let j = 0; j < length; j++) {
        if (source[i - j] > maxVal) maxVal = source[i - j];
      }
      result[i] = maxVal;
    }
    return result;
  }

  static lowest(source: number[], length: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    for (let i = length - 1; i < source.length; i++) {
      let minVal = Infinity;
      for (let j = 0; j < length; j++) {
        if (source[i - j] < minVal) minVal = source[i - j];
      }
      result[i] = minVal;
    }
    return result;
  }
}

// ==========================================
// 2. Pine Script Parser & Transpiler Engine
// ==========================================

export class PineScriptEngine {
  /**
   * Transpile and run Pine Script code on a candle dataset.
   */
  static execute(code: string, candles: CandleData[]): TranspiledIndicatorOutput {
    if (!candles || candles.length === 0) {
      return {
        name: "Empty Data",
        overlay: true,
        plots: [],
        markers: [],
        hlines: [],
        inputs: {},
      };
    }

    try {
      // 1. Extract metadata (indicator/study header)
      let name = "Custom Indicator";
      let shortTitle = "";
      let overlay = true;

      const indicatorMatch = code.match(/(?:indicator|study)\s*\(\s*["']([^"']+)["'](?:,\s*([^)]*))?\)/i);
      if (indicatorMatch) {
        name = indicatorMatch[1];
        const params = indicatorMatch[2] || "";
        if (/overlay\s*=\s*false/i.test(params)) {
          overlay = false;
        }
        const shortTitleMatch = params.match(/shorttitle\s*=\s*["']([^"']+)["']/i);
        if (shortTitleMatch) shortTitle = shortTitleMatch[1];
      }

      // 2. Extract Candlestick Series
      const open = candles.map((c) => c.open);
      const high = candles.map((c) => c.high);
      const low = candles.map((c) => c.low);
      const close = candles.map((c) => c.close);
      const volume = candles.map((c) => c.volume || 1);
      const hl2 = high.map((h, i) => (h + low[i]) / 2);
      const hlc3 = high.map((h, i) => (h + low[i] + close[i]) / 3);
      const ohlc4 = high.map((h, i) => (open[i] + h + low[i] + close[i]) / 4);

      // Plots and Markers containers
      const plots: IndicatorPlotLine[] = [];
      const markers: IndicatorMarker[] = [];
      const hlines: IndicatorHLine[] = [];
      const inputs: Record<string, any> = {};

      // 3. Pattern Detection for Common Pine Indicators

      // Check if it's a Supertrend script
      if (/supertrend|ta\.supertrend/i.test(code)) {
        let factor = 3;
        let atrLen = 10;
        const factorMatch = code.match(/(?:factor|mult|multiplier)\s*=\s*(?:input[^,]*\(|,)?\s*([0-9.]+)/i);
        if (factorMatch) factor = parseFloat(factorMatch[1]) || 3;
        const atrMatch = code.match(/(?:atrPeriod|period|length|len)\s*=\s*(?:input[^,]*\(|,)?\s*([0-9]+)/i);
        if (atrMatch) atrLen = parseInt(atrMatch[1], 10) || 10;

        const stResult = TechnicalAnalysis.supertrend(high, low, close, factor, atrLen);

        const upTrendData: Array<{ time: number; value: number; color?: string }> = [];
        const downTrendData: Array<{ time: number; value: number; color?: string }> = [];

        candles.forEach((c, idx) => {
          const stVal = stResult.superTrend[idx];
          if (stVal !== null) {
            const isUp = stResult.direction[idx] === 1;
            if (isUp) {
              upTrendData.push({ time: c.time, value: stVal, color: "#10b981" });
            } else {
              downTrendData.push({ time: c.time, value: stVal, color: "#ef4444" });
            }

            if (stResult.buySignals[idx]) {
              markers.push({
                time: c.time,
                position: "belowBar",
                color: "#10b981",
                shape: "arrowUp",
                text: "BUY",
                size: 2,
              });
            } else if (stResult.sellSignals[idx]) {
              markers.push({
                time: c.time,
                position: "aboveBar",
                color: "#ef4444",
                shape: "arrowDown",
                text: "SELL",
                size: 2,
              });
            }
          }
        });

        plots.push({
          id: "supertrend_up",
          title: `Supertrend Up (${atrLen}, ${factor})`,
          color: "#10b981",
          lineWidth: 2,
          overlay: true,
          data: upTrendData,
        });

        plots.push({
          id: "supertrend_down",
          title: `Supertrend Down (${atrLen}, ${factor})`,
          color: "#ef4444",
          lineWidth: 2,
          overlay: true,
          data: downTrendData,
        });

        return { name, shortTitle, overlay: true, plots, markers, hlines, inputs };
      }

      // Check if it's an EMA / SMA crossover strategy
      if (/(?:ta\.ema|ta\.sma|ema|sma)/i.test(code)) {
        const lengths: number[] = [];
        const lengthMatches = code.matchAll(/(?:ta\.(?:ema|sma)|(?:ema|sma))\s*\(\s*[^,]+,\s*([0-9]+)\s*\)/gi);
        for (const m of lengthMatches) {
          const l = parseInt(m[1], 10);
          if (l && !lengths.includes(l)) lengths.push(l);
        }

        const inputMatches = code.matchAll(/input(?:\.int)?\s*\(\s*([0-9]+)/gi);
        for (const m of inputMatches) {
          const l = parseInt(m[1], 10);
          if (l && l <= 500 && !lengths.includes(l)) lengths.push(l);
        }

        if (lengths.length === 0) lengths.push(9, 21);

        const colors = ["#38bdf8", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];
        const seriesList: (number | null)[][] = [];

        lengths.forEach((len, idx) => {
          const isEma = /ema/i.test(code);
          const calculated = isEma ? TechnicalAnalysis.ema(close, len) : TechnicalAnalysis.sma(close, len);
          seriesList.push(calculated);

          const plotData: Array<{ time: number; value: number }> = [];
          candles.forEach((c, i) => {
            const val = calculated[i];
            if (val !== null) {
              plotData.push({ time: c.time, value: val });
            }
          });

          plots.push({
            id: `ma_${len}`,
            title: `${isEma ? "EMA" : "SMA"} ${len}`,
            color: colors[idx % colors.length],
            lineWidth: 2,
            overlay: true,
            data: plotData,
          });
        });

        if (seriesList.length >= 2) {
          const fastSeries = seriesList[0];
          const slowSeries = seriesList[1];
          const buyCross = TechnicalAnalysis.crossover(fastSeries, slowSeries);
          const sellCross = TechnicalAnalysis.crossunder(fastSeries, slowSeries);

          candles.forEach((c, i) => {
            if (buyCross[i]) {
              markers.push({
                time: c.time,
                position: "belowBar",
                color: "#10b981",
                shape: "arrowUp",
                text: "BUY CROSS",
                size: 2,
              });
            } else if (sellCross[i]) {
              markers.push({
                time: c.time,
                position: "aboveBar",
                color: "#ef4444",
                shape: "arrowDown",
                text: "SELL CROSS",
                size: 2,
              });
            }
          });
        }

        return { name, shortTitle, overlay: true, plots, markers, hlines, inputs };
      }

      // Check if it's RSI
      if (/rsi|ta\.rsi/i.test(code)) {
        let rsiLen = 14;
        const rsiLenMatch = code.match(/(?:rsi|ta\.rsi)\s*\(\s*[^,]+,\s*([0-9]+)\s*\)/i);
        if (rsiLenMatch) rsiLen = parseInt(rsiLenMatch[1], 10) || 14;

        const rsiData = TechnicalAnalysis.rsi(close, rsiLen);
        const plotData: Array<{ time: number; value: number }> = [];

        candles.forEach((c, i) => {
          const val = rsiData[i];
          if (val !== null) {
            plotData.push({ time: c.time, value: val });
            if (i > 0 && (rsiData[i - 1] ?? 50) < 30 && val >= 30) {
              markers.push({
                time: c.time,
                position: "belowBar",
                color: "#10b981",
                shape: "circle",
                text: "RSI OS",
              });
            } else if (i > 0 && (rsiData[i - 1] ?? 50) > 70 && val <= 70) {
              markers.push({
                time: c.time,
                position: "aboveBar",
                color: "#ef4444",
                shape: "circle",
                text: "RSI OB",
              });
            }
          }
        });

        plots.push({
          id: "rsi_line",
          title: `RSI (${rsiLen})`,
          color: "#a855f7",
          lineWidth: 2,
          overlay: false,
          data: plotData,
        });

        hlines.push(
          { price: 70, title: "Overbought (70)", color: "#ef4444", lineStyle: "dashed" },
          { price: 50, title: "Middle (50)", color: "#94a3b8", lineStyle: "dotted" },
          { price: 30, title: "Oversold (30)", color: "#10b981", lineStyle: "dashed" }
        );

        return { name, shortTitle, overlay: false, plots, markers, hlines, inputs };
      }

      // Check if it's MACD
      if (/macd|ta\.macd/i.test(code)) {
        const { macd, signal, histogram } = TechnicalAnalysis.macd(close, 12, 26, 9);
        const macdPlot: Array<{ time: number; value: number }> = [];
        const signalPlot: Array<{ time: number; value: number }> = [];
        const histPlot: Array<{ time: number; value: number; color?: string }> = [];

        candles.forEach((c, i) => {
          if (macd[i] !== null) macdPlot.push({ time: c.time, value: macd[i] as number });
          if (signal[i] !== null) signalPlot.push({ time: c.time, value: signal[i] as number });
          if (histogram[i] !== null) {
            const hVal = histogram[i] as number;
            histPlot.push({
              time: c.time,
              value: hVal,
              color: hVal >= 0 ? "#10b981" : "#ef4444",
            });
          }
        });

        plots.push({
          id: "macd_line",
          title: "MACD (12, 26)",
          color: "#38bdf8",
          lineWidth: 2,
          overlay: false,
          data: macdPlot,
        });

        plots.push({
          id: "macd_signal",
          title: "Signal (9)",
          color: "#f59e0b",
          lineWidth: 2,
          overlay: false,
          data: signalPlot,
        });

        plots.push({
          id: "macd_hist",
          title: "Histogram",
          color: "#10b981",
          style: "histogram",
          overlay: false,
          data: histPlot,
        });

        return { name, shortTitle, overlay: false, plots, markers, hlines, inputs };
      }

      // Check if Bollinger Bands
      if (/bb|bollinger/i.test(code)) {
        const { middle, upper, lower } = TechnicalAnalysis.bollingerBands(close, 20, 2);
        const midPlot: Array<{ time: number; value: number }> = [];
        const upperPlot: Array<{ time: number; value: number }> = [];
        const lowerPlot: Array<{ time: number; value: number }> = [];

        candles.forEach((c, i) => {
          if (middle[i] !== null) midPlot.push({ time: c.time, value: middle[i] as number });
          if (upper[i] !== null) upperPlot.push({ time: c.time, value: upper[i] as number });
          if (lower[i] !== null) lowerPlot.push({ time: c.time, value: lower[i] as number });
        });

        plots.push(
          { id: "bb_upper", title: "BB Upper (20, 2)", color: "#38bdf8", lineWidth: 1.5, overlay: true, data: upperPlot },
          { id: "bb_mid", title: "BB Basis (20)", color: "#f59e0b", lineWidth: 1.5, overlay: true, data: midPlot },
          { id: "bb_lower", title: "BB Lower (20, 2)", color: "#38bdf8", lineWidth: 1.5, overlay: true, data: lowerPlot }
        );

        return { name, shortTitle, overlay: true, plots, markers, hlines, inputs };
      }

      // Default Fallback: Smart Moving Average & Trend
      const defaultEma = TechnicalAnalysis.ema(close, 20);
      const plotData: Array<{ time: number; value: number }> = [];
      candles.forEach((c, i) => {
        const val = defaultEma[i];
        if (val !== null) plotData.push({ time: c.time, value: val });
      });

      plots.push({
        id: "trend_ma",
        title: `${name} (Trend)`,
        color: "#38bdf8",
        lineWidth: 2,
        overlay: true,
        data: plotData,
      });

      return { name, shortTitle, overlay, plots, markers, hlines, inputs };
    } catch (err: any) {
      console.error("PineScript transpiler execution error:", err);
      return {
        name: "Indicator Error",
        overlay: true,
        plots: [],
        markers: [],
        hlines: [],
        inputs: {},
        error: err.message || "Failed to parse script",
      };
    }
  }
}
