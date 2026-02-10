#!/usr/bin/env python3
import sys, wave, struct

if len(sys.argv) != 3:
    print("usage: decode_lsb.py in.wav out.bin"); sys.exit(1)

inp, outp = sys.argv[1], sys.argv[2]
w = wave.open(inp, "rb")
params = w.getparams()
sampwidth = params.sampwidth
nframes = params.nframes
raw = w.readframes(nframes)
w.close()

if sampwidth != 2:
    print("only 16-bit WAV supported"); sys.exit(1)

samples = struct.unpack("<{}h".format(len(raw)//2), raw)

bits = []
for s in samples:
    bits.append(s & 1)

out = bytearray()
for i in range(0, len(bits), 8):
    byte = 0
    for b in bits[i:i+8]:
        byte = (byte << 1) | b
    out.append(byte)
    if byte == 0:
        break

open(outp, "wb").write(out[:-1])
print("decoded to", outp)
