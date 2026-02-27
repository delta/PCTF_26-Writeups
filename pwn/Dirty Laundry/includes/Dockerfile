FROM ubuntu@sha256:0e5e4a57c2499249aafc3b40fcd541e9a456aab7296681a3994d631587203f97 AS ubuntu

FROM pwn.red/jail

COPY --from=ubuntu / /srv

COPY flag.txt /srv/app/
COPY chal /srv/app/run

EXPOSE 5000/tcp
