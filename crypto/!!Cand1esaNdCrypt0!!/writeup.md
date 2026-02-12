# CandlesadNCrYP10

### 1. Challenge Overview
The service implements a custom digital signature authorization protocol based on a cubic polynomial hash. The objective is to forge a valid signature for a "Transaction" message using only one allowed signature pair from an "Approval" message.

### 2. Cryptographic Primitivesv
From the analysis of `server.py`:
- **Prime Modulus**: $P = 2^{128} - 159$
- **RSA Modulus**: 2048-bit $n$
- **RSA Public Exponent**: $e = 65537$
- **Hash Construction**:
  $$g(x, a, b) = x^3 + ax^2 + bx \pmod P$$
  Where $a, b \in \mathbb{Z}_P$ are secret coefficients and $x$ is the integer encoding of the message.

### 3. Message Structure
Two fixed message prefixes exist:
- **Approval**: `"I approve the agreement:\n"`
- **Transaction**: `"I authorize the transaction:\n"`

The final encoded message is:
$$x = \text{bytes\_to\_long}(\text{prefix} \ || \ \text{suffix} \ || \ \text{padding})$$

### 4. The Intended Security Model
Only one approval signature is allowed per session. The transaction signature must verify such that:
$$SIG^e \equiv g(x, a, b) \pmod n$$
Since the hash coefficients $a, b$ are secret, the hash value $g(x)$ is seemingly unpredictable.

### 5. The Fatal Design Flaw
After signing the approval message ($x_A$), the server leaks two values:
- $L = (r \cdot (a - b)) \pmod P$
- $X = r \pmod P$

**Consequence**: An attacker can immediately compute the difference between coefficients:
$$\Delta = a - b \equiv L \cdot X^{-1} \pmod P$$

### 6. Algebraic Structure of the Hash
Using $\Delta$, we can rewrite the hash function as:
$$g(x, a, b) = x^3 + ax^2 + (a - \Delta)x \pmod P$$
$$g(x, a, b) = x^3 + a(x^2 + x) - \Delta x \pmod P$$
This confirms the hash function is linear with respect to the remaining unknown coefficient $a$.

### 7. Extracting the Hash Value
When we receive the signature $SIG$ for the approval message $x_A$:
$$h_A \equiv SIG^e \pmod n$$
Since $g(x_A) < P \ll n$, we recover the exact integer value of the hash $h_A$.

### 8. Solving for Hidden Coefficients
By rearranging the hash equation for the known message $x_A$:
$$a(x_A^2 + x_A) \equiv h_A - x_A^3 + \Delta x_A \pmod P$$
The coefficient $a$ is solved via a single modular inversion:
$$a = (h_A - x_A^3 + \Delta x_A)(x_A^2 + x_A)^{-1} \pmod P$$
Once $a$ is recovered, $b = a - \Delta \pmod P$.

### 9. Finding a Hash Collision
As $f(x)$ is a cubic, we can find a collision root $x_B$ such that $f(x_A) = f(x_B) = h_A \pmod P$.
We solve:
$$x^3 + ax^2 + bx - h_A \equiv 0 \pmod P$$
Since $x_A$ is a known root, we use polynomial division to reduce the cubic to a quadratic and solve for the collision candidiates.

### 10. Lattice-Based Suffix Construction (CVP)
To submit the collision root as a valid "Transaction" message, we must find a printable 48-byte suffix $S$ that resolves to the integer $x_B \pmod P$. This is a **Target Closest Vector Problem (CVP)**.
- **Basis Construction**: A 49-dimensional lattice basis $B$ is constructed where vectors represent the modular $256^i \pmod P$ components of the suffix.
- **LLL & Babai**: We perform LLL reduction on the basis and use Babai's Nearest Plane to find a printable ASCII vector that satisfies the 128-bit modular constraint.

### 11. Exploit Summary
1.  **Algebraic Recovery**: A single approval signature leaks the internal state of the hash ($a, b$).
2.  **Collision Search**: Solve the cubic polynomial for alternative roots.
3.  **Lattice Optimization**: Use LLL/CVP to "brute-force" a printable message that maps to a specific hash value.
4.  **Signature Reuse**: Submit the collision suffix and the original RSA signature.

### 12. Final Result
The server validates the signature and reveals the flag:
`p_ctf{3l0w-tH3_c4Ndl35.h4VE=-tHe_CaK3!!}`
