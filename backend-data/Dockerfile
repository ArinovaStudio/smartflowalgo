# ==========================================
# SmartFlowAlgo Python MT5 Middleman Bridge
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

ENV PORT=8000
ENV RPYC_HOST=metatrader5
ENV RPYC_PORT=8001

EXPOSE 8000

CMD ["python", "server.py"]
