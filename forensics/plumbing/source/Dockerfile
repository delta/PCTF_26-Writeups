FROM python:3.10-slim
WORKDIR /app
COPY process.py .
COPY env /app/.env
RUN echo "p_ctf{d0ck3r_l34k5_p1p3l1n35}X|O" | python3 process.py
RUN rm /tmp/state_round7.bin
RUN echo "uhh it was here ;-;" > /app/output.bin
COPY DEV_NOTES.txt .
COPY process2.py /app/process.py
