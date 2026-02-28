# Server-OC chal - Write-up

## Challenge Summary
This is a two-part web challenge disguised as a CPU overclocking dashboard. Attackers must figure out the correct sequence of overclocks, revealing a hidden endpoint vulnerable to Prototype Pollution. Afterward, users must combine a hardware hint from `robots.txt` with the first half of the flag to unlock a benchmark tool, where they perform a SSRF attack to grab the rest of the flag.

## Stage 1: Prototype Pollution

### The Overclock Sequence
Randomly sending overclock values doesn't reveal much. Improper sequences lead to the server prompting the user to reset the OC, since it wasn't valid (some OC-knowledge needed here :)).
* First, you need to send 5 consecutive requests with a multiplier value between 51 and 55. 
* These values are stored in an array (`req.session.arr`) within the user's session.
* Next, you must send a multiplier value between 56 and 75.
* The server checks if the previously stored array of 5 values is sorted in ascending order and contains no zeros.
* Sending a sequence like `51, 52, 53, 54, 55` followed by a `56` triggers a system BSOD message and sets the `fetchConfig` flag to true.

### Finding the Hidden Endpoint
Triggering the sequence prompts the frontend to hit the `/leConfig` endpoint, which assigns a JWT token to your cookies. Decoding this JWT reveals a hidden `/logs` endpoint alongside an expected payload structure: `{"Path": "C:\\Windows\\Log\\systemRestore"}`.

### Prototype Pollution Bypass
* The `/logs` endpoint takes the provided JSON payload and merges it into a `sessionUser` object using a custom `recursiveMerge` function.
* The `sessionUser` object has `Object.preventExtensions()` applied to it, meaning new properties cannot be added to it directly. However, polluting the prototype bypasses this object-level restriction.
* To get the flag, the polluted object needs the property `isAdmin` set to `true`.

**Payload:**
```bash
{
  "__proto__": {
    "isAdmin": true
  },
  "Path": "C:\\Windows\\Log\\systemRestore"
}
```
**Result:** `p_ctf{L!qU1d_H3L1um_`

---

## Stage 2: The Benchmark SSRF

### Unlocking the Benchmark (The Hardware Hint)
To unlock the second half of the challenge, we need to send a specific multiplier. The chal's `robots.txt` gives us our first major clue:
```text
CPU=Intel® Core™ i9-9900K
Motherboard=Asus Z390 ROG MAXIMUS XI HERO
```
If we combine this hardware setup with the first half of the flag (`L!qU1d_H3L1um_`), it references a famous real-world overclocking record. Using liquid helium, overclockers pushed the i9-9900K to **7.6 GHz**. 

Sending a multiplier of exactly `76` to `/api/overclock` returns a success message and unlocks the `/benchmark` endpoint tool.

### Bypassing the SSRF Filters
The goal for this stage is to trick the server into fetching the internal URL `http://localhost:3001/benchmark?internal=flag`, which holds the rest of the flag. The application uses two filters we need to bypass:

* **IP Blocklist:** The code explicitly blocks the strings `127.0.0.1` and `localhost`. We can bypass this by converting the local IP address into a different format, such as decimal or octal. `127.0.0.1` becomes `2130706433` in decimal.
* **Keyword Blocklist:** The code also blocks the exact word `internal`. We can bypass this string check by URL-encoding one of the characters. Double encoding the letter `i` as `%2569` turns the parameter into `2569nternal`. The backend's HTTP client will decode this when executing the internal request.

**Target URL Payload:**
```text
http://2130706433:3001/benchmark?2569nternal=flag
```

Providing this crafted URL to the benchmark endpoint successfully bypasses the checks and executes the SSRF to fetch the other half of the flag.

**Result:** `Benchmark Result: Flag : $h0ulD_N0T_T0uch_$3rv3rs}`

## Full Flag
`p_ctf{L!qU1d_H3L1um_$h0ulD_N0T_T0uch_$3rv3rs}`
