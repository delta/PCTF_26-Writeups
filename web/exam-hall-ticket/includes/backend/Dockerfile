FROM python:3.9-slim

WORKDIR /backend

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    chromium \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN npm install 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


CMD ["gunicorn", "-w", "1", "--threads", "100", "-b", "0.0.0.0:3000", "server:app"]