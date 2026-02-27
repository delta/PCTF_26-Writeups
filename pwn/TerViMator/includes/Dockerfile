FROM ubuntu@sha256:34577a83cd7a8f1e55f6eb173fd9bb70c16127a83d6bf06f56f6b1fff9e406b9 as custom

FROM pwn.red/jail

COPY --from=custom / /srv

COPY flag.txt /srv/app/
COPY chal /srv/app/run

EXPOSE 1337/tcp
