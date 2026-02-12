# #Dum C0ws! 🐄

**Category:** Crypto  

## Description
NITT cows speaks gibberish, and they refuse to say "moooooo" unless you fix them.

## Tech Stack
- **Runtime:** Deno
- **Crypto:** `node:crypto` (AES-256-CTR)
- **Vulnerability:** CVE-2026-22863 (Missing `cipher.final()` + Stateful Object Reuse)

## Usage
### Running the Challenge
```bash
# Build
docker build -t dumcows .

# Run
docker run -p 1337:1337 dumcows
```

### Exploitation

## A keystream must NEVER be reused

But this server:
Reuses the same key,
Reuses the same nonce
And For every connection

The service reuses the same `cipher` object instance across a persistent connection (or re-instantiates it with the **same Key/IV** on new connections). This creates a **Keystream Reuse (Two-Time Pad)** vulnerability.

1.  **Keystream Recovery:** Send a long known plaintext (e.g., 200 'A's). The server responds with `Ciphertext = Plaintext ^ Keystream`. Recover `Keystream`.
2.  **Secret Decryption:** Start a new connection (resetting the generic state) and send an empty name. The server encrypts input (length 0) then encrypts `SECRET_SOUND` using `Keystream[0:]`. Decrypt it using the recovered keystream.
3.  **Authentication:** Send `FIX_COW <Secret_Sound>`. The server confirms and encrypts the `FLAG` using `Keystream[len(Secret_Sound):]`.
4.  **Flag Decryption:** Decrypt the flag using the corresponding offset of the keystream.

## Files
- `server.ts`: The vulnerable Deno server.
- `cowsay.ts`: Helper for ASCII art.
- `solve.py`: Reference solver script.
