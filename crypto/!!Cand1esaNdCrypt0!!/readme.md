# !!Cand1esaNdCrypt0!!
## TL;DR

This is an algebraic cryptanalysis challenge where players must recover hidden cubic coefficients from a masked linear leakage. By combining RSA hash recovery with an algebraic grey-box attack, players can find cubic collision roots. The final stage requires using high-dimensional lattice reduction (LLL) to find a printable 48-byte suffix that satisfies the collision constraint in a 128-bit prime field.

## Given Files

- `server.py`: The challenge service source code.
- `public.pem`: RSA public key for hash recovery.

## Application Overview

- **CandlesCake Secure Ordering**: A network service pretending to be a secure transaction handler.
- **Option 1: Sign Approval**: Signs a message with a user-provided 48-byte suffix and returns an RSA signature, alongside leaked parameters `L` and `X`.
- **Option 2: Execute Transaction**: Requires the signature from Option 1 but for a different message prefix.
- **Quota**: You get exactly **one** signature per session.
- **Goal**: Find a "Transaction" message that hashes to the same value as an "Approval" message.

## Step 1: RSA Hash Recovery

The server returns an RSA signature `SIG` of the hash `h`. Using the provided `public.pem`, players must first extract the hash value:
$$h = \text{SIG}^E \pmod N$$
This `h` is the value the cubic polynomial must evaluate to for both messages.

## Step 2: Hidden Coefficient Recovery (Algebraic Attack)

The server leaks two values after the first signature:
1. `L = (r * (a - b)) % P`
2. `X = r`

By analyzing the provided `server.py` logic, we can derive:
$$a - b = L \cdot X^{-1} \pmod P \implies b = a - (L \cdot X^{-1}) \pmod P$$
Substituting this into the hash equation for the first message $x_1$:
$$h = x_1^3 + a \cdot x_1^2 + (a - (L \cdot X^{-1})) \cdot x_1 \pmod P$$
This is a linear equation in $a$, allowing for its direct recovery.

## Step 3: Root Finding and Collision

With $a$ and $b$ recovered, the polynomial $f(x) = x^3 + ax^2 + bx - h \equiv 0 \pmod P$ is fully known. Solving for roots yields:
1. $x_1$ (The Approval message).
2. $x_2, x_3$ (Potential collision candidates).

## Step 4: Printable Suffix Search (Lattice CVP)

The Transaction message must have a fixed prefix and a **printable 48-byte suffix**. Since we need the message to map to one of the roots $x_2$, we have a target remainder for the suffix.
Using a 49-dimensional lattice and **Babai’s Nearest Plane** algorithm (or Randomized Target CVP), we can find a vector that satisfies the remainder constraint while staying within the printable ASCII range $[32, 126]$. 
With 48 bytes in a 128-bit field, the solution density is extremely high, and a valid collision can be found almost instantly.

## Impact

- Forgeable transaction signatures.
- Full compromise of the "secure" ordering system.
- Captured Flag: `p_ctf{3l0w-tH3_c4Ndl35.h4VE=-tHe_CaK3!!}`
