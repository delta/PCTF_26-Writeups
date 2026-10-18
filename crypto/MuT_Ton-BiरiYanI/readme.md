# MuT_Ton-BiरiYanI: The Lattice Canteen (V20)

## TL;DR

This challenge exploits a **Speculative State Desynchronization** bug combined with a **Lattice-based PRNG recovery** vector. Players must gather high-precision numeric leaks from a calibration system to reconstruct the server's internal **MT19937** state. Once the state is recovered, the player can predict a future voucher ID and exploit an optimistic verification flaw where the backend (Kitchen) trusts a speculative flag set by a shallow front-end (Counter) check.

## Given Files

*   `challenge.py`: Core service logic (White-Box).
*   **Hint**: The 100-decimal precision in `QUERY` is not for show — it's the key to the basis.
*   **Hint**: The Kitchen is optimistic, but the trust is fragile. One wrong step and it resets.

## Architecture

`Player <=> Automated Canteen Terminal (Counter) <=> Internal Kitchen Verifier`

### Key Properties:
*   The system uses a private **MT19937 PRNG** initialized per session.
*   The terminal implements a `QUERY` command that leaks roots of quadratic equations $ax^2 + bx + c = 0$ where $a, b, c$ are 32-bit random integers.
*   The voucher verification is split into `EXTRACT` (Speculative/Shallow) and `REDEEM` (Final/Deep).
*   A "Fragile State" bug exists where the trust flag `protocol_ok` is cleared by any non-extraction command.

## Core Bug

The Canteen violates **State Invariant Integrity**:

1.  **Numeric Side-Channel**: The `QUERY` command returns high-precision floats that are roots of random quadratic equations. This allows for coefficient recovery via **LLL Lattice Reduction**.
2.  **State Smuggling**: Since the voucher generation uses the same PRNG stream as the calibration data, the "Golden Voucher" is predictable.
3.  **Speculative Desynch**: The backend `REDEEM` command checks a boolean flag `protocol_ok` instead of re-verifying the voucher's cryptographic integrity. This flag is set by the `EXTRACT` command after a successful shallow format/match check.

## Exploitation

### 1. The Lattice Attack (Discovery)
Collect ~240 samples from `QUERY`. Construct a 3x3 Lattice Basis:
```
[ 1, 0, K*x^2 ]
[ 0, 1, K*x   ]
[ 0, 0, K     ]
```
where $K = 10^{120}$. Use **LLL** to find the shortest vector $(a, b, \epsilon)$, revealing the original PRNG outputs.

### 2. State Reconstruction
Untemper the recovered coefficients using **Z3** to reconstruct the MT19937 internal state. Predict the future `VCH_ID`.

### 3. State-Race Trigger
The exploit is a precise sequence to maintain the fragile speculative trust:
1.  `ADD BIRIYANI`: Ensure the target is in the tray.
2.  `EXTRACT <predicted_vch>`: Set `protocol_ok = True`.
3.  `REDEEM <predicted_vch> KITCHEN`: Finalize while the flag is still high.

If any command (like `QUERY` or `ADD`) is sent after `EXTRACT`, the trust is invalidated and the transaction fails.
