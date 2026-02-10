#!/usr/bin/env python3
import sys

def load_key():
    with open("/app/.env", "r") as f:
        for line in f:
            if line.startswith("AES_KEY="):
                return line.strip().split("=", 1)[1].encode()
    raise RuntimeError("AES_KEY not found")

KEY = load_key()

ROUNDS = 10
DEBUG_ROUND = 7

def xor_block(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def permute(block):
    return block[4:] + block[:4]

def encrypt_block(block, leak_debug=False):
    state = block
    for r in range(1, ROUNDS + 1):
        state = xor_block(state, KEY)
        state = permute(state)
        if leak_debug and r == DEBUG_ROUND:
            with open("/tmp/state_round7.bin", "wb") as f:
                f.write(state)
    return state

def main():
    data = sys.stdin.buffer.read().strip()
    block1 = data[:16]
    block2 = data[16:32]

    encrypt_block(block1, leak_debug=True)
    out2 = encrypt_block(block2)

    with open("/app/output.bin", "wb") as f:
        f.write(out2)

if __name__ == "__main__":
    main()
