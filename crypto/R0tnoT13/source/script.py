#!/usr/bin/env python3
from Crypto.Cipher import AES
from Crypto.Util.number import long_to_bytes
import secrets, random


N = 128
ALLOWED_K = [2, 4, 8, 16, 32, 64]
FLAG = b"p_ctf{l1nyrl34k}"
assert len(FLAG) <= 16


def rotr(x, k, n=128):
    return ((x >> k) | (x << (n - k))) & ((1 << n) - 1)


seed = secrets.randbits(128)
nonce = b"PCTF_PRNG_NONCE!"  

aes = AES.new(long_to_bytes(seed, 16), AES.MODE_ECB)
state = int.from_bytes(aes.encrypt(nonce), "big")

states = []
for k in ALLOWED_K:
    r = state ^ rotr(state, k)
    states.append((k, r))

random.shuffle(states)


keystream = long_to_bytes(state, 16)
cipher = bytes(a ^ b for a, b in zip(FLAG, keystream))

with open("challenge.txt", "w") as f:
    f.write("== States ==\n")
    for k, r in states:
        f.write(f"{k} {r}\n")

    f.write("\n== Ciphertext (hex) ==\n")
    f.write(cipher.hex())