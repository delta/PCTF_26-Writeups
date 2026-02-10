#!/usr/bin/env python3
import sys, wave, struct

SECRET = b"transform"  # hardcoded secret

if len(sys.argv) != 3:
    print("usage: embed_simple.py in.wav out.wav"); sys.exit(1)

inp, outp = sys.argv[1], sys.argv[2]
w = wave.open(inp, "rb")
params = w.getparams()
nchannels, sampwidth, framerate, nframes = params.nchannels, params.sampwidth, params.framerate, params.nframes
raw = w.readframes(nframes); w.close()

if sampwidth != 2:
    print("only 16-bit WAV supported"); sys.exit(1)

samples = list(struct.unpack("<{}h".format(len(raw)//2), raw))
total_capacity = len(samples)
bits = []
for b in SECRET:
    for i in range(8):
        bits.append((b >> (7 - i)) & 1)
bits += [0]*8  # terminator byte of zero

if len(bits) > total_capacity:
    print("not enough capacity"); sys.exit(1)

out_samples = samples[:]
for i, bit in enumerate(bits):
    val = out_samples[i]
    out_samples[i] = (val & ~1) | bit

out_raw = struct.pack("<{}h".format(len(out_samples)), *out_samples)
w2 = wave.open(outp, "wb")
w2.setnchannels(nchannels); w2.setsampwidth(sampwidth); w2.setframerate(framerate)
w2.writeframes(out_raw); w2.close()
print("embedded", len(SECRET), "bytes ->", outp)
