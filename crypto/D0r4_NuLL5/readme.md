# D0r4_NuLL5 
## TL;DR

This challenge exploits a cryptographic implementation flaw in the authentication verification logic. The server calculates an XOR checksum of the differences between expected and provided bytes, rather than verifying that *all* differences are zero. This allows an attacker to bypass authentication with a probability of $1/256$ per attempt by sending arbitrary responses.

## Given files

*   `source/challenge.py`: The server-side python script.
*   `solve.py`: Reference solver implementing the probabilistic attack.
*   `Dockerfile`: Deployment configuration.

## Architecture

Client → Socat (TCP 1339) → Python Challenge Script

**Key properties:**
*   Uses a custom Challenge-Response authentication protocol.
*   Implements AES-ECB and HMAC-SHA256 for credential derivation.
*   "Administrator" account exists with a hidden high-entropy password.
*   Authentication is stateless per connection.

## Core Bug

The `verify_credential` function in `challenge.py` violates the principle of secure comparison:

> **A secure comparison must fail if ANY byte of the input differs from the expected value.**

In the challenge code:

```python
def verify_credential(session_key, expected, provided):
    # ... derived mask ...
    checksum = 0
    for i in range(8):
        # Accumulates the XOR difference of all bytes
        checksum ^= expected[i] ^ provided[i] ^ mask[i]
    
    # Only checks if the final XOR sum is 0
    return checksum == 0
```

On a random guess:
*   The attacker sends a random/empty response.
*   The `expected` and `mask` values are unknown and uniformly distributed.
*   The resulting `checksum` behaves like a random 8-bit integer.
*   The probability that `checksum == 0` is exactly $1/256$.

Instead of requiring a collision on all 64 bits ($1/2^{64}$), the check essentially reduces the security margin to 8 bits ($1/2^{8}$).

## Exploitation

To exploit this, we perform a brute-force attack against the reduced security margin.

**Attack Loop:**

1.  Connect to the server.
2.  Send a blank or fixed challenge (e.g., `00`*8).
3.  Send the target username: `Administrator`.
4.  Send a blank or fixed response (e.g., `00`*8).
5.  Check if the server responds with the flag.

**Math:**
*   Success probability ($p$): $1/256 \approx 0.39\%$
*   Expected attempts ($E = 1/p$): 256
*   Attempts for 99% confidence: $\approx 1177$

**Payload:**

Since the server accepts hex input, we can just send zeros to normalize the input, relying purely on the statistical likelihood of the XOR sum collapsing to zero.

```python
# Simplified interaction
client_challenge = "0000000000000000"
username = "Administrator"
client_response = "0000000000000000"

# Repeat until "p_ctf{...}" is received
```
