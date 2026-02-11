# Crypto Writeup – Linear Rotation Leak

## Challenge Summary

During a security audit, we are given partial diagnostic logs from a faulty randomness subsystem.  
The system maintains a **128-bit internal state `S`**, and for certain rotation offsets `k`, it logs:

S ⊕ ROTR(S, k)

Due to a crash, only a few such frames were captured.  
Additionally, a ciphertext encrypted using the internal state `S` is provided.

Our goal is to **reconstruct the internal state `S`** and recover the flag.

---

## Given

- Several leaked diagnostic frames of the form: `S ⊕ ROTR(S, k)`
- Corresponding rotation offsets `k`
- Ciphertext encrypted by XOR-ing with `S`
- `S` is 128 bits

---

## Key Observation

For any bit position `i`:

`(S ⊕ ROTR(S, k))_i = S_i ⊕ S_{(i + k) mod 128}`



This means **each leaked frame gives us linear XOR relations between bits of `S`**.

So the problem reduces to solving a system of linear equations over **GF(2)** (binary field).

---

## Exploiting Rotation by 2

One of the leaked frames uses `k = 2`, which is especially useful:

`S ⊕ ROTR(S, 2)`


This creates equations of the form:

`S_i ⊕ S_{i+2} = d_i`


This splits the 128 bits into **two independent cycles**:

- Even-indexed bits: `0 → 2 → 4 → ... → 126`
- Odd-indexed bits:  `1 → 3 → 5 → ... → 127`

Each cycle only has **one degree of freedom** (the starting bit), meaning:
- Even bits depend on `S_0`
- Odd bits depend on `S_1`

Thus, the entire 128-bit state is determined by **just two unknown bits**.

---

## Reconstructing the State

### Step 1: Convert Frame to Bits

We extract the bit representation of:

`S ⊕ ROTR(S, 2)`


This gives us the difference constraints between bits two positions apart.

---

### Step 2: Build Bit Constraints

For even and odd cycles separately, we propagate XOR differences cumulatively:

- Even indices use `S_0` as base
- Odd indices use `S_1` as base

This gives a symbolic expression for every bit in terms of `S_0` or `S_1`.

---

### Step 3: Brute-Force the Remaining 2 Bits

There are only 4 possibilities:

`(S_0, S_1) ∈ {(0,0), (0,1), (1,0), (1,1)}`


For each possibility:
1. Reconstruct the full 128-bit candidate `S`
2. Verify it against **all leaked frames**
3. If all frames match, `S` is correct

---

## Verification

For a candidate state `S`, we check:



S ⊕ ROTR(S, k) == leaked_frame[k] for all k


Only one candidate satisfies all constraints.

---

## Decryption

The ciphertext was encrypted by XOR-ing with the internal state:


Once the correct `S` is found, decryption is trivial.

---

## Solution Code

```python
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

```
---
## final flag

`p_ctf{l1nyrl34k}`

## Takeaway

This challenge demonstrates how linear leakage from bitwise operations (like rotation + XOR) can completely break cryptographic secrecy—even with very limited data.

Rotation-based integrity checks and debug logs should never expose raw state-dependent values.