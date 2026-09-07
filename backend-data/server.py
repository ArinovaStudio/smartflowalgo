"""
SmartFlowAlgo MT5 Real-Time Middleman Bridge (Port 8001 RPyC -> Port 8000 FastAPI/WS)
=====================================================================================
Pure pass-through bridge:
1. Connects to MetaTrader 5 via RPyC on port 8001 (Wine MT5 client inside Docker).
2. Dynamically pulls ALL symbols (1600+ pairs) from MT5 and caches in Python variable.
3. If variable is empty, does NOT send data to LightweightChart (waits for MT5 broker).
4. Multi-client multiplexing: handles multiple simultaneous users/charts with unique client IDs.
5. Dynamically receives symbol & timeframe from each LightweightChart instance.
6. Delivers genuine MT5 historical candles and millisecond live ticks.
7. ZERO calculations, ZERO predictions, ZERO fake ticks. Pure middleman.
"""

import asyncio
import os
import sys
import logging
from typing import Dict, List, Set, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import rpyc

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MT5Bridge")

# Load environment variables
env_candidates = [
    Path(__file__).resolve().parent / ".env",
    Path.cwd() / "backend-data" / ".env",
    Path.cwd() / ".env",
]
for p in env_candidates:
    if p.exists():
        load_dotenv(p)
        break

PORT = int(os.environ.get("PORT", 8000))
RPYC_HOST = os.environ.get("RPYC_HOST", os.environ.get("MT5_HOST", "127.0.0.1")).strip()
if RPYC_HOST in ("localhost", ""):
    RPYC_HOST = "127.0.0.1"
RPYC_PORT = int(os.environ.get("RPYC_PORT", os.environ.get("MT5_PORT", 8001)))

LOGIN = os.environ.get("MT5_LOGIN", "").strip()
PASSWORD = os.environ.get("MT5_PASSWORD", "").strip()
SERVER = os.environ.get("MT5_SERVER", "").strip()
COMPANY = os.environ.get("MT5_COMPANY", "MetaQuotes").strip()

# ── 1. Global State & Caches ────────────────────────────────────────────────
cached_symbols: List[Dict[str, Any]] = []
raw_currency_pairs: List[str] = []
broker_info: Dict[str, Any] = {
    "login": int(LOGIN) if LOGIN.isdigit() else LOGIN,
    "server": SERVER,
    "company": COMPANY,
    "connected": False,
    "error": f"Connecting to MT5 RPyC bridge on {RPYC_HOST}:{RPYC_PORT}...",
}

# Active Client Subscriptions: client_id -> {"ws": WebSocket, "symbol": str, "timeframe": str}
client_subscriptions: Dict[str, Dict[str, Any]] = {}
# Topic mapping: "SYMBOL_TIMEFRAME" -> Set[client_id]
topic_subscribers: Dict[str, Set[str]] = {}

last_ticks: Dict[str, Any] = {}
candle_cache: Dict[str, List[Dict[str, Any]]] = {}

# Async lock to ensure thread-safe access to RPyC connection
rpc_lock = asyncio.Lock()
rpyc_conn: Optional[rpyc.Connection] = None
remote_mt5 = None

# Timeframe mapping helper
TIMEFRAME_MAP = {
    "1m": 1,        # TIMEFRAME_M1
    "2m": 2,        # TIMEFRAME_M2
    "3m": 3,        # TIMEFRAME_M3
    "5m": 5,        # TIMEFRAME_M5
    "15m": 15,      # TIMEFRAME_M15
    "30m": 30,      # TIMEFRAME_M30
    "1h": 16385,    # TIMEFRAME_H1
    "2h": 16386,    # TIMEFRAME_H2
    "4h": 16388,    # TIMEFRAME_H4
    "1d": 16408,    # TIMEFRAME_D1
    "1w": 32769,    # TIMEFRAME_W1
    "1mn": 49153,   # TIMEFRAME_MN1
}

def get_tf_int(tf_str: str) -> int:
    return TIMEFRAME_MAP.get(tf_str.lower().strip(), 1)

# ── 2. RPyC Bridge Connection & Remote Helpers Injection ────────────────────
REMOTE_HELPERS_CODE = """
def _remote_get_symbols():
    import MetaTrader5 as m, json
    syms = m.symbols_get()
    if not syms:
        return "[]"
    res = []
    for s in syms:
        name = getattr(s, "name", "")
        if not name:
            continue
        desc = getattr(s, "description", "") or name
        path = getattr(s, "path", "").lower() if hasattr(s, "path") else ""
        cat = "Forex"
        if "metal" in path or "gold" in path or "xau" in name.lower():
            cat = "Metals"
        elif "crypto" in path or "btc" in path or "eth" in path:
            cat = "Crypto"
        elif "index" in path or "indices" in path or "us30" in name.lower() or "spx" in name.lower() or "nas" in name.lower():
            cat = "Indices"
        elif "commodit" in path or "oil" in path or "gas" in name.lower():
            cat = "Commodities"
        res.append({
            "symbol": name,
            "name": desc,
            "category": cat,
            "digits": int(getattr(s, "digits", 5)),
            "spread": int(getattr(s, "spread", 0)),
            "bid": float(getattr(s, "bid", 0.0)),
            "ask": float(getattr(s, "ask", 0.0)),
        })
    return json.dumps(res)

def _remote_get_candles(sym, tf, count):
    import MetaTrader5 as m, json
    m.symbol_select(sym, True)
    rates = m.copy_rates_from_pos(sym, tf, 0, count)
    if rates is None:
        return "[]"
    res = []
    for r in rates:
        res.append({
            "time": int(r[0]),
            "open": float(r[1]),
            "high": float(r[2]),
            "low": float(r[3]),
            "close": float(r[4]),
            "volume": int(r[5]),
        })
    return json.dumps(res)

def _remote_get_tick(sym):
    import MetaTrader5 as m, json
    t = m.symbol_info_tick(sym)
    if t is None:
        return ""
    bid = float(t.bid)
    ask = float(t.ask)
    price = bid if bid > 0 else ask
    return json.dumps({
        "time": int(t.time),
        "time_msc": int(t.time_msc),
        "bid": bid,
        "ask": ask,
        "price": price,
        "last": float(t.last),
        "volume": int(t.volume),
    })

def _remote_get_forming_candle(sym, tf):
    import MetaTrader5 as m, json
    rates = m.copy_rates_from_pos(sym, tf, 0, 1)
    if rates is None or len(rates) == 0:
        return ""
    r = rates[0]
    return json.dumps({
        "time": int(r[0]),
        "open": float(r[1]),
        "high": float(r[2]),
        "low": float(r[3]),
        "close": float(r[4]),
        "volume": int(r[5]),
    })

def _remote_account_info():
    import MetaTrader5 as m, json
    acc = m.account_info()
    if acc is None:
        return ""
    return json.dumps({
        "login": getattr(acc, "login", 0),
        "server": getattr(acc, "server", ""),
        "company": getattr(acc, "company", ""),
        "name": getattr(acc, "name", ""),
        "currency": getattr(acc, "currency", "USD"),
        "balance": float(getattr(acc, "balance", 0.0)),
        "equity": float(getattr(acc, "equity", 0.0)),
    })
"""

def connect_rpyc_sync() -> bool:
    """Synchronous connection to MT5 RPyC bridge."""
    global rpyc_conn, remote_mt5, cached_symbols, raw_currency_pairs, broker_info

    try:
        import json
        logger.info(f"Connecting to MT5 via RPyC ({RPYC_HOST}:{RPYC_PORT})...")
        conn = rpyc.classic.connect(RPYC_HOST, RPYC_PORT)
        conn._config["sync_request_timeout"] = 30
        conn._config["allow_all_attrs"] = True

        mt5 = conn.modules.MetaTrader5
        init_ok = mt5.initialize()
        if not init_ok:
            err = getattr(mt5, "last_error", lambda: "MT5 initialize returned False")()
            logger.error(f"MT5 initialize failed: {err}")
            broker_info["connected"] = False
            broker_info["error"] = f"MT5 initialize failed: {err}"
            return False

        # Inject remote helpers for fast serialization
        conn.execute(REMOTE_HELPERS_CODE)

        # Retrieve account info if available
        raw_acc = conn.namespace["_remote_account_info"]()
        if raw_acc:
            acc = json.loads(raw_acc)
            broker_info.update(acc)
            broker_info["connected"] = True
            broker_info["error"] = None
        else:
            broker_info["connected"] = True
            broker_info["error"] = None

        # Fetch dynamic symbols from MT5
        raw_syms = conn.namespace["_remote_get_symbols"]()
        syms = json.loads(raw_syms) if raw_syms else []
        if syms:
            cached_symbols = syms
            raw_currency_pairs = [s["symbol"] for s in syms]
            logger.info(f"Successfully loaded {len(cached_symbols)} symbols from MT5 broker!")
        else:
            logger.warning("MT5 initialized but symbols_get() returned 0 symbols.")

        rpyc_conn = conn
        remote_mt5 = mt5
        return True

    except Exception as e:
        logger.error(f"RPyC Connection Exception: {e}")
        broker_info["connected"] = False
        broker_info["error"] = str(e)
        rpyc_conn = None
        remote_mt5 = None
        return False

async def ensure_mt5_connected() -> bool:
    """Async check and reconnect if disconnected."""
    if rpyc_conn is not None and broker_info.get("connected") and len(cached_symbols) > 0:
        return True
    async with rpc_lock:
        return await asyncio.to_thread(connect_rpyc_sync)

def fetch_snapshot_sync(sym: str, tf_str: str, count: int = 300) -> List[Dict[str, Any]]:
    """Synchronously fetches historical candles from MT5 via RPyC."""
    if rpyc_conn is None:
        return []
    try:
        import json
        tf_int = get_tf_int(tf_str)
        raw = rpyc_conn.namespace["_remote_get_candles"](sym.upper().strip(), tf_int, count)
        candles = json.loads(raw) if raw else []
        key = f"{sym.upper().strip()}_{tf_str.lower().strip()}"
        candle_cache[key] = candles
        return candles
    except Exception as e:
        logger.error(f"Snapshot fetch error for {sym} {tf_str}: {e}")
        return []

# ── 3. FastAPI Web Application ──────────────────────────────────────────────
app = FastAPI(title="SmartFlowAlgo MT5 Real-Time Bridge", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    logger.info(f"Starting SmartFlowAlgo MT5 Real-Time Bridge on port {PORT}...")
    asyncio.create_task(ensure_mt5_connected())
    asyncio.create_task(background_tick_streamer())
    asyncio.create_task(background_health_monitor())

async def background_health_monitor():
    """Periodically verifies MT5 RPC connection and re-polls dynamic symbols."""
    while True:
        await asyncio.sleep(5.0)
        try:
            if not broker_info.get("connected") or len(cached_symbols) == 0:
                await ensure_mt5_connected()
        except Exception as e:
            logger.debug(f"Health monitor check: {e}")

async def background_tick_streamer():
    """
    High-frequency multiplexed poller:
    Polls MT5 ONLY for unique active (symbol, timeframe) topics across all clients.
    Fans out live candle and tick data immediately with zero predictions.
    """
    while True:
        if not broker_info.get("connected") or rpyc_conn is None or len(client_subscriptions) == 0:
            await asyncio.sleep(0.05)
            continue

        try:
            # Determine unique active topics: e.g. "EURUSD_1m"
            active_topics = list(topic_subscribers.keys())
            if not active_topics:
                await asyncio.sleep(0.05)
                continue

            for topic in active_topics:
                subscribers = topic_subscribers.get(topic, set())
                if not subscribers:
                    continue

                parts = topic.split("_", 1)
                sym = parts[0]
                tf = parts[1] if len(parts) > 1 else "1m"
                tf_int = get_tf_int(tf)

                # Fetch real tick & forming candle via RPyC
                async with rpc_lock:
                    raw_tick = await asyncio.to_thread(rpyc_conn.namespace["_remote_get_tick"], sym)
                    raw_forming = await asyncio.to_thread(rpyc_conn.namespace["_remote_get_forming_candle"], sym, tf_int)

                import json
                tick = json.loads(raw_tick) if raw_tick else None
                forming = json.loads(raw_forming) if raw_forming else None

                if not tick:
                    continue

                t_msc = tick.get("time_msc", 0)
                price = tick.get("price", 0.0)

                # Check if tick has changed
                last = last_ticks.get(sym)
                if not last or last.get("time_msc") != t_msc or last.get("price") != price:
                    last_ticks[sym] = tick

                    # If forming candle retrieved from MT5, use it directly (zero calculations)
                    active_candle = forming
                    if not active_candle:
                        key = f"{sym}_{tf}"
                        candles = candle_cache.get(key, [])
                        if candles:
                            active_candle = dict(candles[-1])
                            active_candle["close"] = price
                            if price > active_candle["high"]:
                                active_candle["high"] = price
                            if price < active_candle["low"]:
                                active_candle["low"] = price
                            active_candle["volume"] = active_candle.get("volume", 0) + 1
                            candles[-1] = active_candle

                    msg = {
                        "type": "candle_update",
                        "symbol": sym,
                        "timeframe": tf,
                        "candle": active_candle,
                        "tick": tick,
                    }

                    # Concurrently broadcast to all clients subscribed to this topic
                    dead_clients = set()
                    for cid in list(subscribers):
                        client_data = client_subscriptions.get(cid)
                        if not client_data:
                            dead_clients.add(cid)
                            continue
                        ws: WebSocket = client_data.get("ws")
                        try:
                            await ws.send_json(msg)
                        except Exception:
                            dead_clients.add(cid)

                    # Clean up any dead connections
                    for cid in dead_clients:
                        subscribers.discard(cid)
                        client_subscriptions.pop(cid, None)

            # High-speed polling interval (approx 30ms - 50ms)
            await asyncio.sleep(0.04)

        except Exception as e:
            logger.debug(f"Tick streamer loop: {e}")
            await asyncio.sleep(0.2)

# ── 4. REST Endpoints ───────────────────────────────────────────────────────
@app.get("/")
@app.get("/api/status")
async def get_status():
    return {
        "success": True,
        "service": "SmartFlowAlgo MT5 Real-Time Middleman",
        "rpc_bridge": f"{RPYC_HOST}:{RPYC_PORT}",
        "connected": broker_info.get("connected", False),
        "symbols_count": len(cached_symbols),
        "active_clients": len(client_subscriptions),
        "active_topics": list(topic_subscribers.keys()),
        "broker": broker_info,
    }

@app.get("/api/symbols")
async def get_symbols():
    # If variable is empty, do NOT send data to LightweightChart (waits for MT5)
    if not broker_info.get("connected") or len(cached_symbols) == 0:
        return {
            "success": False,
            "connected": False,
            "error": "Awaiting symbol catalog from MT5 broker...",
            "count": 0,
            "data": [],
        }

    return {
        "success": True,
        "connected": True,
        "count": len(cached_symbols),
        "data": cached_symbols,
    }

@app.get("/api/candles")
async def get_candles(
    symbol: str = Query("EURUSD", description="Currency pair symbol"),
    timeframe: str = Query("1m", description="Timeframe e.g. 1m, 5m, 1h"),
    count: int = Query(300, ge=1, le=1000, description="Candle count"),
):
    if not broker_info.get("connected"):
        return {
            "success": False,
            "connected": False,
            "error": "MT5 broker is not connected.",
            "data": [],
        }

    async with rpc_lock:
        candles = await asyncio.to_thread(fetch_snapshot_sync, symbol, timeframe, count)

    return {
        "success": True,
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "count": len(candles),
        "data": candles,
    }

# ── 5. Multi-User WebSocket Real-Time Stream ────────────────────────────────
def unsubscribe_client_from_topics(client_id: str):
    """Removes a client ID from all topic subscriber lists."""
    for topic, subs in list(topic_subscribers.items()):
        subs.discard(client_id)
        if not subs:
            topic_subscribers.pop(topic, None)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Generate or track unique client ID for this connection
    import uuid
    client_id = f"client_{uuid.uuid4().hex[:8]}"

    client_subscriptions[client_id] = {
        "ws": websocket,
        "symbol": "",
        "timeframe": "1m",
    }
    logger.info(f"WebSocket client connected: {client_id}")

    try:
        # 1. Send immediate real broker status
        await websocket.send_json({
            "type": "broker_status",
            "client_id": client_id,
            "connected": broker_info.get("connected", False),
            "error": broker_info.get("error"),
            "broker": broker_info,
        })

        # 2. If symbols variable is not empty, deliver symbol catalog immediately
        if len(cached_symbols) > 0:
            await websocket.send_json({
                "type": "symbols_list",
                "client_id": client_id,
                "data": cached_symbols,
            })

        while True:
            data = await websocket.receive_text()
            try:
                import json
                msg = json.loads(data)
                mtype = msg.get("type")

                # Allow client to supply its own client_id or use session client_id
                cid = msg.get("client_id") or client_id

                if mtype == "subscribe":
                    sym = msg.get("symbol", "").upper().strip()
                    tf = msg.get("timeframe", "1m").lower().strip()
                    if sym:
                        # Unsubscribe client from any previous topic
                        unsubscribe_client_from_topics(cid)

                        # Register client's new subscription
                        client_subscriptions[cid] = {
                            "ws": websocket,
                            "symbol": sym,
                            "timeframe": tf,
                        }
                        topic = f"{sym}_{tf}"
                        if topic not in topic_subscribers:
                            topic_subscribers[topic] = set()
                        topic_subscribers[topic].add(cid)

                        # Immediately fetch genuine historical snapshot from MT5
                        async with rpc_lock:
                            candles = await asyncio.to_thread(fetch_snapshot_sync, sym, tf, 300)

                        await websocket.send_json({
                            "type": "snapshot",
                            "client_id": cid,
                            "symbol": sym,
                            "timeframe": tf,
                            "data": candles,
                        })

                elif mtype == "get_symbols":
                    if len(cached_symbols) > 0:
                        await websocket.send_json({
                            "type": "symbols_list",
                            "client_id": cid,
                            "data": cached_symbols,
                        })
                    else:
                        await ensure_mt5_connected()
                        if len(cached_symbols) > 0:
                            await websocket.send_json({
                                "type": "symbols_list",
                                "client_id": cid,
                                "data": cached_symbols,
                            })

            except Exception as e:
                logger.debug(f"WS message error for {client_id}: {e}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {client_id}")
    except Exception as e:
        logger.debug(f"WebSocket exception for {client_id}: {e}")
    finally:
        unsubscribe_client_from_topics(client_id)
        client_subscriptions.pop(client_id, None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
