FROM ubuntu@sha256:34577a83cd7a8f1e55f6eb173fd9bb70c16127a83d6bf06f56f6b1fff9e406b9 as custom

RUN apt-get update && \
    apt-get install -y python3 && \
    rm -rf /var/lib/apt/lists/*

FROM pwn.red/jail

COPY --from=custom / /srv

COPY chal.py /srv/app/run
COPY flag.txt /srv/app/flag.txt

RUN chmod +x /srv/app/run

