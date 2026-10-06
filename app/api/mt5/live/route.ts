/**
 * app/api/mt5/live/route.ts
 *
 * POST /api/mt5/live   body: { "symbol": "EURUSD" }      (GET ?symbol= also works)
 *
 * Relays MT5 ticks for ONE symbol as Server-Sent Events:
 *
 *   event: ready                      <- MT5 socket is open (also sent after every reconnect)
 *   data: {"t":1735689600123,"p":1.0421,"v":0}     t = ms, p = price (bid), v = tick volume
 *   : ping                            <- heartbeat comment every 15 s
 *
 * This route deliberately does NOT build candles. The browser provider already
 * holds the real MT5 history bar, so it can continue the forming candle from it
 * instead of restarting it from the first tick it happens to see, and it can
 * build any timeframe (including resampled ones) from one stream per symbol.
 */
import { cleanSymbol, errorResponse, getEnv, HttpError, resolveBrokerSymbol } from "../mt5-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 15_000;

export async function POST(request: Request) {
    let symbol = "";
    try {
        const body = (await request.json()) as { symbol?: unknown } | null;
        symbol = cleanSymbol(body?.symbol);
    } catch {
        /* fall through to the validation below */
    }
    return stream(request, symbol);
}

export async function GET(request: Request) {
    return stream(request, cleanSymbol(new URL(request.url).searchParams.get("symbol")));
}

async function stream(request: Request, symbol: string): Promise<Response> {
    try {
        if (!symbol) throw new HttpError(400, "symbol is required");
        const env = getEnv();
        if (typeof WebSocket === "undefined") {
            throw new HttpError(500, "Global WebSocket is unavailable. Use Node 22+ or polyfill it with the 'ws' package.");
        }

        const broker = await resolveBrokerSymbol(env, symbol);
        const wsUrl =
            `${env.wsBase}/ws/ticks?symbols=${encodeURIComponent(broker)}` +
            `&api_key=${encodeURIComponent(env.apiKey)}`;

        const encoder = new TextEncoder();
        let closed = false;
        let socket: WebSocket | null = null;
        let heartbeat: ReturnType<typeof setInterval> | null = null;
        let openTimer: ReturnType<typeof setTimeout> | null = null;
        let ctl: ReadableStreamDefaultController<Uint8Array> | null = null;

        const shutdown = () => {
            if (closed) return;
            closed = true;
            if (heartbeat) clearInterval(heartbeat);
            if (openTimer) clearTimeout(openTimer);
            try { socket?.close(); } catch { /* already closed */ }
            try { ctl?.close(); } catch { /* already closed */ }
        };

        const send = (text: string) => {
            if (closed || !ctl) return;
            try {
                ctl.enqueue(encoder.encode(text));
            } catch {
                shutdown();
            }
        };

        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                ctl = controller;
                console.log(`[MT5] live stream ${symbol}${broker !== symbol ? ` -> ${broker}` : ""}`);

                socket = new WebSocket(wsUrl);

                openTimer = setTimeout(() => {
                    send(`event: error\ndata: ${JSON.stringify({ message: "MT5 tick socket did not open in time" })}\n\n`);
                    shutdown();
                }, OPEN_TIMEOUT_MS);

                socket.onopen = () => {
                    if (openTimer) clearTimeout(openTimer);
                    openTimer = null;
                    send(`event: ready\ndata: ${JSON.stringify({ symbol: broker })}\n\n`);
                    heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
                };

                socket.onmessage = (event) => {
                    const raw = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
                    let tick: Record<string, unknown>;
                    try {
                        tick = JSON.parse(raw) as Record<string, unknown>;
                    } catch {
                        return;
                    }
                    if (!tick || String(tick.symbol ?? "").toUpperCase() !== broker.toUpperCase()) return;

                    const bid = Number(tick.bid);
                    const last = Number(tick.last);
                    const ask = Number(tick.ask);
                    const price = bid > 0 ? bid : last > 0 ? last : ask > 0 ? ask : null;
                    if (price === null) return;

                    const rawTime = Number(tick.time_msc ?? tick.time);
                    const t = Number.isFinite(rawTime) && rawTime > 0 ? (rawTime < 1e12 ? rawTime * 1000 : rawTime) : Date.now();
                    const volume = Number(tick.volume);
                    send(`data: ${JSON.stringify({ t, p: price, v: Number.isFinite(volume) && volume > 0 ? volume : 0 })}\n\n`);
                };

                socket.onerror = () => {
                    console.error(`[MT5] tick socket error for ${broker}`);
                    send(`event: error\ndata: ${JSON.stringify({ message: "MT5 tick socket error" })}\n\n`);
                    shutdown();
                };

                socket.onclose = () => shutdown();
            },
            cancel() {
                shutdown();
            },
        });

        request.signal.addEventListener("abort", shutdown, { once: true });

        return new Response(body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
}