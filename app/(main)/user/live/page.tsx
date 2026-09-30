"use client";

import { useEffect, useState } from "react";

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

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    complete: boolean;
}

export default function LiveCandleTest() {
    const [timeframe, setTimeframe] =
        useState<Timeframe>("M1");

    useEffect(() => {
        let reader: ReadableStreamDefaultReader<Uint8Array> | null =
            null;

        let cancelled = false;

        async function connectToLiveCandle() {
            try {
                console.log(
                    `[LIVE] Connecting ${timeframe}...`
                );

                const response = await fetch(
                    "/api/mt5/live",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            symbol: "EURUSD",
                            timeframe,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }

                if (!response.body) {
                    throw new Error(
                        "Streaming response body is missing"
                    );
                }

                console.log(
                    `[LIVE] Connected ${timeframe}`
                );

                reader = response.body.getReader();

                const decoder = new TextDecoder();

                let buffer = "";

                while (!cancelled) {
                    const { value, done } =
                        await reader.read();

                    if (done) {
                        console.log(
                            `[LIVE] Stream closed ${timeframe}`
                        );

                        break;
                    }

                    buffer += decoder.decode(value, {
                        stream: true,
                    });

                    const messages =
                        buffer.split("\n\n");

                    // Keep incomplete message
                    buffer = messages.pop() || "";

                    for (const message of messages) {
                        if (!message.startsWith("data:")) {
                            continue;
                        }

                        const json = message
                            .replace(/^data:\s*/, "")
                            .trim();

                        if (!json) {
                            continue;
                        }

                        try {
                            const candle =
                                JSON.parse(json) as Candle;

                            console.log(
                                `[LIVE CANDLE ${timeframe}]`,
                                candle
                            );

                            console.log(
                                "Time:",
                                new Date(
                                    candle.time * 1000
                                ).toLocaleTimeString()
                            );

                            console.log(
                                "OHLC:",
                                candle.open,
                                candle.high,
                                candle.low,
                                candle.close
                            );

                            console.log(
                                "Complete:",
                                candle.complete
                            );
                        } catch (error) {
                            console.error(
                                "[LIVE] Invalid candle:",
                                json,
                                error
                            );
                        }
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        `[LIVE] ${timeframe} connection error:`,
                        error
                    );
                }
            }
        }

        connectToLiveCandle();

        return () => {
            cancelled = true;

            console.log(
                `[LIVE] Disconnecting ${timeframe}`
            );

            if (reader) {
                reader.cancel().catch(() => { });
                reader = null;
            }
        };
    }, [timeframe]);

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">
                Live Candle Test
            </h1>

            <div className="flex gap-2">
                {(
                    ["M1", "M5", "M15", "H1"] as Timeframe[]
                ).map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-2 rounded ${timeframe === tf
                                ? "bg-black text-white"
                                : "bg-gray-200"
                            }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <p className="mt-4">
                Streaming: <strong>{timeframe}</strong>
            </p>

            <p className="text-sm text-gray-500 mt-2">
                Open the browser DevTools → Console to see
                the live candles.
            </p>
        </div>
    );
}