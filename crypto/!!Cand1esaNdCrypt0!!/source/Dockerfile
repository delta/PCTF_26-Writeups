FROM python:3.10-slim

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .


EXPOSE 1338

CMD ["socat", "-T", "30", "TCP-LISTEN:1338,reuseaddr,fork", "EXEC:python3 server.py,stderr"]
