FROM ubuntu:22.04 as custom

RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /srv/app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

FROM pwn.red/jail
ENV JAIL_MEM=30M

COPY --from=custom / /srv

COPY challenge.py /srv/app/run
COPY flag.txt /srv/app/flag.txt

RUN chmod +x /srv/app/run
