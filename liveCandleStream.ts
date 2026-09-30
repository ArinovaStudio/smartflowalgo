import WebSocket from "ws";

export type Timeframe =
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "M5"
  | "M6"
  | "M10"
  | "M12"
  | "M15"
  | "M20"
  | "M30"
  | "H1"
  | "H2"
  | "H3"
  | "H4"
  | "H6"
  | "H8"
  | "H12"
  | "D1"
  | "W1"
  | "MN1";

export interface LiveTick {
  symbol: string;
  time: number;
  bid: number;
  ask: number;
  last?: number;
  volume?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  complete: boolean;
}

interface CandleCallbacks {
  onCandle?: (candle: Candle) => void;
  onComplete?: (candle: Candle) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

function timeframeToSeconds(timeframe: Timeframe): number {
  const value = parseInt(timeframe);

  if (timeframe.startsWith("M")) {
    return value * 60;
  }

  if (timeframe.startsWith("H")) {
    return value * 60 * 60;
  }

  if (timeframe === "D1") {
    return 24 * 60 * 60;
  }

  if (timeframe === "W1") {
    return 7 * 24 * 60 * 60;
  }

  if (timeframe === "MN1") {
    return 30 * 24 * 60 * 60;
  }

  throw new Error(`Unsupported timeframe: ${timeframe}`);
}

export class LiveCandleStream {
  private ws: any = null;

  private currentCandle: Candle | null = null;

  private readonly timeframeSeconds: number;

  constructor(
    private readonly options: {
      apiKey: string;
      symbol: string;
      timeframe: Timeframe;
      url?: string;
      callbacks?: CandleCallbacks;
    }
  ) {
    this.timeframeSeconds = timeframeToSeconds(
      options.timeframe
    );
  }

  connect() {
    const baseUrl =
      this.options.url ?? "ws://127.0.0.1:8001";

    const url =
      `${baseUrl}/ws/ticks` +
      `?symbols=${encodeURIComponent(this.options.symbol)}` +
      `&api_key=${encodeURIComponent(this.options.apiKey)}`;

    // Support both browser (native WebSocket) and Node.js (ws) environments
    if (typeof window !== "undefined" && typeof window.WebSocket !== "undefined") {
      const nativeWs = new window.WebSocket(url);
      const listeners: Record<string, ((...args: any[]) => void)[]> = {};

      const shim = {
        on(event: string, handler: (...args: any[]) => void) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
          return shim;
        },
        close() {
          nativeWs.close();
        },
      };

      nativeWs.onopen = () => {
        listeners["open"]?.forEach((fn) => fn());
      };
      nativeWs.onmessage = (event) => {
        listeners["message"]?.forEach((fn) => fn(event.data));
      };
      nativeWs.onerror = (event) => {
        listeners["error"]?.forEach((fn) => fn(new Error("WebSocket error")));
      };
      nativeWs.onclose = () => {
        listeners["close"]?.forEach((fn) => fn());
      };

      this.ws = shim;
    } else {
      this.ws = new WebSocket(url);
    }

    this.ws.on("open", () => {
      console.log(
        `[MT5] Connected: ${this.options.symbol} ${this.options.timeframe}`
      );

      this.options.callbacks?.onOpen?.();
    });

    this.ws.on("message", (message: any) => {
      try {
        const tick = JSON.parse(
          message.toString()
        ) as LiveTick;

        this.processTick(tick);
      } catch (error) {
        console.error(
          "[MT5] Failed to process tick:",
          error
        );
      }
    });

    this.ws.on("error", (error: any) => {
      console.error("[MT5] WebSocket error:", error);

      this.options.callbacks?.onError?.(
        error instanceof Error
          ? error
          : new Error(String(error))
      );
    });

    this.ws.on("close", () => {
      console.log("[MT5] WebSocket closed");

      this.options.callbacks?.onClose?.();

      this.ws = null;
    });
  }

  private processTick(tick: LiveTick) {
    if (
      !tick ||
      tick.symbol !== this.options.symbol ||
      typeof tick.time !== "number"
    ) {
      return;
    }

    /**
     * Use bid as the candle price.
     *
     * If your MT5 payload provides `last` and
     * you prefer last-traded price, you can change
     * this to:
     *
     * const price = tick.last ?? tick.bid;
     */
    const price = tick.bid;

    if (
      typeof price !== "number" ||
      !Number.isFinite(price)
    ) {
      return;
    }

    /**
     * MT5 timestamp is Unix seconds.
     *
     * Example:
     *
     * 10:25:17
     *
     * M1:
     * 10:25:00
     */
    const candleTime =
      Math.floor(
        tick.time / this.timeframeSeconds
      ) * this.timeframeSeconds;

    /**
     * No candle exists yet.
     */
    if (!this.currentCandle) {
      this.currentCandle = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: tick.volume ?? 0,
        complete: false,
      };

      this.emitCurrent();

      return;
    }

    /**
     * New timeframe candle.
     *
     * Example:
     *
     * Current M5:
     * 10:25:00
     *
     * New tick:
     * 10:30:01
     *
     * Therefore 10:25 candle is complete.
     */
    if (candleTime > this.currentCandle.time) {
      const completedCandle = {
        ...this.currentCandle,
        complete: true,
      };

      this.options.callbacks?.onComplete?.(
        completedCandle
      );

      /**
       * Start new candle.
       */
      this.currentCandle = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: tick.volume ?? 0,
        complete: false,
      };

      this.emitCurrent();

      return;
    }

    /**
     * Same candle.
     */
    this.currentCandle.high = Math.max(
      this.currentCandle.high,
      price
    );

    this.currentCandle.low = Math.min(
      this.currentCandle.low,
      price
    );

    this.currentCandle.close = price;

    this.currentCandle.volume +=
      tick.volume ?? 0;

    /**
     * Send the updated current candle
     * on every incoming tick.
     */
    this.emitCurrent();
  }

  private emitCurrent() {
    if (!this.currentCandle) {
      return;
    }

    this.options.callbacks?.onCandle?.({
      ...this.currentCandle,
    });
  }

  getCurrentCandle(): Candle | null {
    if (!this.currentCandle) {
      return null;
    }

    return {
      ...this.currentCandle,
    };
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentCandle = null;
  }
}
