# Dora-Nulls

### Challenge Overview
The challenge presents a custom challenge–response authentication protocol implemented over a TCP socket. An Administrator account exists on the server, and successful authentication as this user reveals the flag.

At first glance, the protocol uses modern primitives:
- HKDF with SHA-256
- AES-ECB
- HMAC-SHA256

Despite this, a subtle verification logic flaw allows authentication to be bypassed probabilistically without knowing the secret.

### Server-Side Authentication Flow
The login flow implemented in `challenge.py` is:
1. Client submits:
   - `challenge` (8 bytes, chosen by client)
   - `username`
2. Server generates:
   - `server_challenge` (8 random bytes)
3. Both sides derive a session key:
   ```python
   session_key = HKDF(
       master = secret,
       salt   = client_challenge || server_challenge,
       key_len = 16
   )
   ```
4. Server computes an expected credential using AES:
   - AES-ECB encryption
   - Iterative XOR-based state mutation
   - Produces an 8-byte value
5. Server verifies the credential using a masked XOR checksum.

### The Critical Flaw
The vulnerability lies in the credential verification function:
```python
def verify_credential(session_key, expected, provided):
    h = HMAC.new(session_key, expected, SHA256)
    mask = h.digest()[:8]

    checksum = 0
    for i in range(8):
        checksum ^= expected[i] ^ provided[i] ^ mask[i]

    return checksum == 0
```

### Why This Is Broken
Instead of performing a byte-wise comparison, the server XORs all 8 bytes together into a single checksum and accepts authentication if the final XOR equals zero. This collapses 64 bits of authentication data into 1 byte of entropy.

### Consequence
For any login attempt, there are 256 possible checksum values. A random response succeeds with probability $1/256$, independent of the secret key.

### Exploitation Strategy
We do not need to understand or reproduce the cryptography. Instead:
1. Use the fixed `Administrator` username.
2. Send:
   - Any valid-length client challenge (e.g., all zeroes).
   - Any valid-length response (e.g., all zeroes).
3. Repeat until the checksum condition randomly passes.

This is a probabilistic authentication bypass.

### Solver Implementation
The provided solver (`solve.py`) replays the login protocol exactly, using constant values for the client challenge and response, and repeats until success.
- **Expected success rate**: 1/256 per attempt.
- ~1177 attempts gives ~99% success probability.
- Usually succeeds within seconds locally.

### Why This Works Reliably
- Each attempt is statistically independent.
- Server allows unlimited login attempts (no rate-limiting or lockout).
- Verification collapses entropy catastrophically.

### Final Result
After a successful probabilistic login as Administrator, the server reveals the flag:
`p_ctf{th15_m4ps-w0n't_l3ads_2_tr34s3ure!}`
