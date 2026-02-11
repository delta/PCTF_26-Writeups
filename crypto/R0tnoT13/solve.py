#!/usr/bin/env python3
# Input Data
frames = {
    8:  183552667878302390742187834892988820241,
    4:  303499033263465715696839767032360064630,
    16: 206844958160238142919064580247611979450,
    2:  163378902990129536295589118329764595602,
    64: 105702179473185502572235663113526159091,
    32: 230156190944614555973250270591375837085,
}

ciphertext = bytes.fromhex("477eb79b46ef667f16ddd94ca933c7c0")

N = 128
MASK = (1 << N) - 1




def rotr(x, k, n=N):
    """Rotate-right k bits on n-bit integer."""
    return ((x >> k) | (x << (n - k))) & ((1 << n) - 1)

def int_to_bits(x, n=N):
    """Convert integer to list of bits (LSB first)."""
    return [(x >> i) & 1 for i in range(n)]

def bits_to_int(bits):
    """Convert list of bits (LSB first) to integer."""
    out = 0
    for i, b in enumerate(bits):
        out |= (b << i)
    return out


d = int_to_bits(frames[2])



bit_offset = [0] * N

cum = 0
for i in range(0, N, 2):
    bit_offset[i] = cum
    cum ^= d[i]


cum = 0
for i in range(1, N, 2):
    bit_offset[i] = cum
    cum ^= d[i]



for s0 in (0, 1):
    for s1 in (0, 1):

        bits = [0] * N
        for i in range(N):
            base = s0 if (i % 2 == 0) else s1
            bits[i] = base ^ bit_offset[i]

        S = bits_to_int(bits)

        # Verify against all leaked frames
        ok = True
        for k, leaked in frames.items():
            if (S ^ rotr(S, k)) != leaked:
                ok = False
                break

        if not ok:
            continue

        # Decrypt ciphertext (XOR with state)
        S_bytes = S.to_bytes(16, "big")
        plaintext = bytes(c ^ s for c, s in zip(ciphertext, S_bytes))

        print("[+] Valid state recovered")
        print(f"    s0 = {s0}, s1 = {s1}")
        print(f"    Plaintext: {plaintext!r}")
