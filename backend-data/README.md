# SmartFlowAlgo MetaTrader 5 (MT5) Bridge & Streamer

This folder contains the middleware server that bridges **MetaTrader 5 (MT5)** to the **Next.js Lightweight Charts** frontend.

---

## Architecture

```
[ MetaTrader 5 Desktop / MetaApi Cloud ]
                 │
                 │ Native MT5 IPC / MetaApi RPC
                 ▼
     [ Python / Node.js Bridge ]
        (FastAPI / WebSocket Server on :8000)
                 │
                 │ Real-Time WebSocket (Live ticks & 1ms candles)
                 ▼
  [ SmartFlowAlgo Lightweight Charts ]
  (Renders Candlesticks + Pine Script Transpiler)
```

---

## 🚀 Option 1: Python MT5 Bridge (Recommended for MT5 Desktop)

### 1. Requirements
- Python 3.9+
- Windows (for native `MetaTrader5` package)

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start Bridge
```bash
python server.py
```
Or double-click `run_python_bridge.bat`.

The bridge will start on `http://localhost:8001` and `ws://localhost:8001/ws`.

---

## ⚡ Option 2: Node.js Bridge (MetaApi / Cloud)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Bridge
```bash
npm start
```
Or double-click `run_node_bridge.bat`.

---

## REST & WebSocket API Endpoints

- `GET /api/status`: Check MT5 connection and active clients.
- `GET /api/symbols`: List supported symbols with real-time bid, ask, and spread.
- `GET /api/candles?symbol=XAUUSD&timeframe=1m&count=300`: Historical OHLCV candles.
- `WS /ws`: Real-time subscription feed.
  - Subscribe message: `{"type": "subscribe", "symbol": "XAUUSD", "timeframe": "1m"}`
  - Receives live candle updates & ticks every millisecond!
