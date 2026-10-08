/**
 * app/api/mt5/history/route.ts
 *
 * GET /api/mt5/history?symbol=EURUSD&timeframe=H1&count=1500
 *
 * Short-lived JSON request (no held-open connection), so any number of
 * request.security() series can load in parallel without exhausting the
 * browser's per-host connection limit.
 *
 * `timeframe` must be a native MT5 code. The browser-side provider resamples
 * everything else (45m, 3D, 3M ...) from these.
 */
import {
    NATIVE_TIMEFRAMES,
    cleanSymbol,
    dedupe,
    errorResponse,
    getEnv,
    HttpError,
    isNativeTimeframe,
    loadRates,
} from "../mt5-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COUNT = 50_000;

export async function GET(request: Request) {
    try {
        const params = new URL(request.url).searchParams;
        const symbol = cleanSymbol(params.get("symbol"));
        const timeframe = (params.get("timeframe") || "M1").toUpperCase();
        const requested = Number(params.get("count") ?? 1500);
        const count = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), MAX_COUNT) : 1500;

        if (!symbol) throw new HttpError(400, "symbol is required");
        if (!isNativeTimeframe(timeframe)) {
            throw new HttpError(400, `Invalid timeframe "${timeframe}". MT5 timeframes: ${NATIVE_TIMEFRAMES.join(", ")}`);
        }

        const env = getEnv();
        const { symbol: brokerSymbol, rates } = await dedupe(
            `${symbol}|${timeframe}|${count}`,
            () => loadRates(env, symbol, timeframe, count),
        );

        return Response.json(
            {
                symbol: brokerSymbol,
                timeframe,
                // [time(ms), open, high, low, close, volume]
                bars: rates.map((r) => [r.time, r.open, r.high, r.low, r.close, r.volume]),
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return errorResponse(error);
    }
}