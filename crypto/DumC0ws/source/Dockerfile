FROM denoland/deno:bin as deno
FROM ubuntu:22.04 as custom

COPY --from=deno /deno /bin/deno

FROM pwn.red/jail
ENV JAIL_MEM=50M

COPY --from=custom / /srv

COPY server.ts /srv/app/server.ts
COPY cowsay.ts /srv/app/cowsay.ts
COPY flag.txt /srv/app/flag.txt

RUN echo '#!/bin/sh\n/bin/deno run --allow-net --allow-read --allow-env server.ts' > /srv/app/run && \
    chmod +x /srv/app/run
