FROM pwn.red/jail
ENV JAIL_MEM=30M
COPY --from=ubuntu:22.04 / /srv
COPY challenge.py /srv/app/run
COPY flag.txt /srv/app/flag.txt
RUN chmod +x /srv/app/run
