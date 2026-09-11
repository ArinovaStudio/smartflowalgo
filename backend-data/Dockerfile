# ==========================================
# SmartFlowAlgo Python MT5 Middleman Bridge
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . ./

# Copy the backend .env file so server.py can load it via python-dotenv
COPY .env .env

EXPOSE 8000

CMD ["python", "server.py"]
