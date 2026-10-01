import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Timeframe =
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

interface LiveTick {
    symbol: string;
    time: number;
    bid: number;
    ask: number;
    last?: number;
    volume?: number;
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    complete: boolean;
}

function timeframeToSeconds(timeframe: string): number {
    const tf = (timeframe || "M1").toUpperCase().trim();
    if (tf === "MN1" || tf === "1MN") return 30 * 24 * 60 * 60;
    if (tf === "W1" || tf === "1W") return 7 * 24 * 60 * 60;
    if (tf === "D1" || tf === "1D") return 24 * 60 * 60;

    if (tf.startsWith("M")) {
        const mins = parseInt(tf.slice(1), 10);
        return (!isNaN(mins) && mins > 0 ? mins : 1) * 60;
    }
    if (tf.endsWith("M")) {
        const mins = parseInt(tf.slice(0, -1), 10);
        return (!isNaN(mins) && mins > 0 ? mins : 1) * 60;
    }

    if (tf.startsWith("H")) {
        const hours = parseInt(tf.slice(1), 10);
        return (!isNaN(hours) && hours > 0 ? hours : 1) * 3600;
    }
    if (tf.endsWith("H")) {
        const hours = parseInt(tf.slice(0, -1), 10);
        return (!isNaN(hours) && hours > 0 ? hours : 1) * 3600;
    }

    return 60;
}

function normalizeTickTime(time: any): number {
    if (typeof time === "number" && !isNaN(time) && time > 0) {
        // MT5 returned milliseconds
        if (time > 1_000_000_000_000) {
            return Math.floor(time / 1000);
        }
        return Math.floor(time);
    }
    return Math.floor(Date.now() / 1000);
}

export async function POST(
    request: NextRequest
) {
    try {
        const body = await request.json();

        const symbol: string =
            body.symbol || "EURUSD";

        const timeframe: Timeframe =
            body.timeframe || "M1";

        const apiKey =
            process.env.MT5_API_KEY;

        if (!apiKey) {
            return Response.json(
                {
                    error: "MT5_API_KEY is missing",
                },
                { status: 500 }
            );
        }

        const timeframeSeconds =
            timeframeToSeconds(timeframe);

        const baseUrl =
            process.env.MT5_WS_URL ||
            "ws://127.0.0.1:8001";

        const wsUrl =
            `${baseUrl}/ws/ticks` +
            `?symbols=${encodeURIComponent(symbol)}` +
            `&api_key=${encodeURIComponent(apiKey)}`;

        console.log(
            `[MT5] Starting stream ${symbol} ${timeframe}`
        );

        const encoder = new TextEncoder();

        let socket: WebSocket | null = null;
        let currentCandle: Candle | null = null;

        const stream = new ReadableStream({
            start(controller) {
                socket = new WebSocket(wsUrl);

                socket.onopen = async () => {
                    console.log(
                        `[MT5] Connected ${symbol} ${timeframe}`
                    );

                    // Send recent historical candles for this symbol and timeframe if available
                    try {
                        const httpUrl = baseUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
                        // Pine indicators often request previous-day/session
                        // levels. 100 bars is less than one trading day on M1
                        // and leaves request.security() without prior periods.
                        const ratesUrl = `${httpUrl}/rates/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&count=1500`;
                        const res = await fetch(ratesUrl, {
                            headers: { "X-API-Key": apiKey },
                            cache: "no-store",
                            signal: AbortSignal.timeout(3000),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const list = Array.isArray(data) ? data : (Array.isArray(data?.rates) ? data.rates : []);
                            for (const item of list) {
                                const rawT = typeof item.time === "number" ? item.time : Math.floor(new Date(item.time).getTime() / 1000);
                                const alignedT = Math.floor(normalizeTickTime(rawT) / timeframeSeconds) * timeframeSeconds;
                                sendCandle(controller, encoder, {
                                    time: alignedT,
                                    open: Number(item.open),
                                    high: Number(item.high),
                                    low: Number(item.low),
                                    close: Number(item.close),
                                    volume: Number(item.volume || item.tick_volume || 0),
                                    complete: true,
                                });
                            }
                        }
                    } catch {
                        // Live ticks will continue
                    }

                    // Let chart providers know the complete historical batch
                    // has been sent before they return the initial snapshot.
                    try {
                        controller.enqueue(encoder.encode("event: history_end\ndata: {}\n\n"));
                    } catch {
                        socket?.close();
                    }
                };

                socket.onmessage = (event) => {
                    try {
                        const tick =
                            JSON.parse(
                                event.data.toString()
                            ) as LiveTick;

                        if (
                            !tick ||
                            !tick.symbol ||
                            tick.symbol.toUpperCase() !== symbol.toUpperCase()
                        ) {
                            return;
                        }

                        const price =
                            typeof tick.bid === "number" && Number.isFinite(tick.bid)
                                ? tick.bid
                                : typeof tick.last === "number" && Number.isFinite(tick.last)
                                ? tick.last
                                : typeof tick.ask === "number" && Number.isFinite(tick.ask)
                                ? tick.ask
                                : null;

                        if (
                            price === null
                        ) {
                            return;
                        }

                        /*
                         * IMPORTANT:
                         * Convert MT5 timestamp to seconds.
                         */
                        const tickTime =
                            normalizeTickTime(tick.time ?? (tick as any).time_msc);

                        /*
                         * Convert tick time into the
                         * beginning of its timeframe.
                         *
                         * M1:
                         * 11:24:31 -> 11:24:00
                         *
                         * M5:
                         * 11:24:31 -> 11:20:00
                         *
                         * M15:
                         * 11:24:31 -> 11:15:00
                         */
                        const candleTime =
                            Math.floor(
                                tickTime /
                                timeframeSeconds
                            ) *
                            timeframeSeconds;

                        /*
                         * FIRST CANDLE
                         */
                        if (!currentCandle) {
                            currentCandle = {
                                time: candleTime,
                                open: price,
                                high: price,
                                low: price,
                                close: price,
                                volume:
                                    tick.volume ?? 0,
                                complete: false,
                            };

                            sendCandle(
                                controller,
                                encoder,
                                currentCandle
                            );

                            return;
                        }

                        /*
                         * NEW CANDLE
                         *
                         * This only happens when the
                         * timeframe boundary changes.
                         */
                        if (
                            candleTime >
                            currentCandle.time
                        ) {
                            /*
                             * Close previous candle
                             */
                            const completedCandle: Candle = {
                                ...currentCandle,
                                complete: true,
                            };

                            sendCandle(
                                controller,
                                encoder,
                                completedCandle
                            );

                            /*
                             * Create new candle
                             */
                            currentCandle = {
                                time: candleTime,
                                open: price,
                                high: price,
                                low: price,
                                close: price,
                                volume:
                                    tick.volume ?? 0,
                                complete: false,
                            };

                            sendCandle(
                                controller,
                                encoder,
                                currentCandle
                            );

                            return;
                        }

                        /*
                         * SAME CANDLE
                         *
                         * Every tick inside the timeframe
                         * updates this candle.
                         */
                        currentCandle.high =
                            Math.max(
                                currentCandle.high,
                                price
                            );

                        currentCandle.low =
                            Math.min(
                                currentCandle.low,
                                price
                            );

                        currentCandle.close =
                            price;

                        currentCandle.volume +=
                            tick.volume ?? 0;

                        /*
                         * Send updated candle
                         */
                        sendCandle(
                            controller,
                            encoder,
                            currentCandle
                        );
                    } catch (error) {
                        console.error(
                            "[MT5] Tick processing error:",
                            error
                        );
                    }
                };

                socket.onerror = (error) => {
                    console.error(
                        "[MT5] WebSocket error:",
                        error
                    );

                    try {
                        controller.close();
                    } catch { }
                };

                socket.onclose = () => {
                    console.log(
                        `[MT5] WebSocket closed ${symbol}`
                    );

                    try {
                        controller.close();
                    } catch { }
                };
            },

            cancel() {
                console.log(
                    `[MT5] Client disconnected ${symbol}`
                );

                if (socket) {
                    socket.close();
                    socket = null;
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type":
                    "text/event-stream",
                "Cache-Control":
                    "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error: any) {
        console.error(
            "[MT5] Live candle error:",
            error
        );

        return Response.json(
            {
                error:
                    error?.message ||
                    "Failed to connect to MT5",
            },
            { status: 500 }
        );
    }
}

function sendCandle(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    candle: Candle
) {
    controller.enqueue(
        encoder.encode(
            `data: ${JSON.stringify(candle)}\n\n`
        )
    );
}
