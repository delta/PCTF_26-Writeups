# DumC0ws! 

### Challenge Overview
The challenge exposes a TCP service that behaves like an interactive cowsay-style oracle. The user is prompted to “Give your cow a name”, after which the server responds with a cowsay output containing Base64-looking data. 

Eventually, the service asks the client to submit a `FIX_COW <secret>` command, after which an encrypted flag is returned. From a black-box perspective, no source code is initially assumed, requiring the analysis of protocol behavior, outputs, and repetition patterns.

---

### Phase 1: Reconnaissance & Protocol Observation
Connecting to the service reveals the following behavior:
1.  **Server Prompt**: `Give your cow a name:`
2.  **Interaction**: User input is accepted (arbitrary string).
3.  **Response**: Server responds with a cowsay output containing:
    -   A `[Name: ...]` field.
    -   A `says: ...` field.
    -   Both fields contain Base64-encoded binary data.

#### Mathematical Foundation
The structure suggests a stream cipher or a block cipher in a streaming mode (like CTR). In these modes, encryption is defined by the bitwise XOR $(\oplus)$ operation between the plaintext $(\mathcal{P})$ and a pseudorandom keystream $(\mathcal{K})$.
$$\mathcal{C} = \mathcal{P} \oplus \mathcal{K}$$

---

### Phase 2: Identifying the Chosen-Plaintext Oracle
We test whether user input influences the encrypted output. Sending a long, known plaintext (e.g., 300 "A"s) results in a `[Name: ...]` Base64 output whose decoded length exactly matches the plaintext length.

**Critical Insight**: The server is using a stream-based XOR cipher. If the keystream is reused across sessions, the system is fundamentally broken.
$$\mathcal{K} = \mathcal{C} \oplus \mathcal{P}$$

---

### Phase 3: Keystream Recovery
By sending a known plaintext $P_{known}$, we can derive the raw keystream bytes:
1.  **Action**: Send $L=300$ bytes of "A" ($0x41$).
2.  **Capture**: Decode the Base64 from the `[Name: ...]` field to get $C_{name}$.
3.  **Calculation**: $\mathcal{K}[0:L] = \mathcal{C}_{name} \oplus \mathcal{P}_{known}$.

If we send null bytes ($0x00$), the ciphertext *is* the keystream, as $0 \oplus X = X$.

---

### Phase 4: Detecting Nonce/Keystream Reuse
Opening a new connection and sending a different name (or an empty name) reveals that the `says: ...` field still produces a valid ciphertext. Since encryption is XOR-based and the keystream is identical for every new connection, we can decrypt this unknown internal message:
$$\mathcal{P}_{sound} = \mathcal{C}_{sound} \oplus \mathcal{K}[offset : offset + len(\mathcal{C}_{sound})]$$

The `says: ...` field represents a `SECRET_SOUND`. By XORing its ciphertext with our recovered keystream, we obtain the ASCII string: `moooooooooooomfT_T`.

---

### Phase 5: Command Injection & Flag exfiltration
The protocol expects the command `FIX_COW <secret>`.
1.  **Command**: Submit `FIX_COW moooooooooooomfT_T`.
2.  **Server Action**: The server validates the secret and returns an encrypted flag.
3.  **The Offset Problem**: The `cipher` state is continuous. To decrypt the flag, we must account for all bytes processed by the cipher so far in the current session.
    -   Let $N$ be the length of the name input.
    -   Let $S$ be the length of the secret sound.
    -   The flag is encrypted using the keystream starting at index $O = N + S$.

#### Final decryption:
$$\mathcal{P}_{flag} = \mathcal{C}_{flag} \oplus \mathcal{K}[O : O + len(\mathcal{C}_{flag})]$$

---

### Root Cause Analysis
- **Vulnerability**: Keystream Reuse in a Stream Cipher.
- **Crypto-Primitive**: AES-256-CTR with fixed Key/IV.
- **Impact**: Full Keystream recovery via Chosen-Plaintext Attack (CPA), leading to total compromise of the encrypted protocol.

### Captured Flag
`p_ctf{Giv3_sm-H20-t0_C0WSS:./}`
