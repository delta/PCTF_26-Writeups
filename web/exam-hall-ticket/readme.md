# Hall Ticket chal - Write-up

## Challenge Summary
This challenge revolves around a student trying to obtain and print their exam hall ticket through a multi-stage exploitation chain. The attack path begins with an encoding-based SQL injection (CVE-2025-1094) to modify the user's attendance record. Next, the attacker bypasses an artificially throttled download using HTTP Range requests. Finally, the attacker embeds a malicious XSS payload into the downloaded PDF's metadata, abusing a headless browser bot to hit an internal endpoint, clear the print queue, and retrieve the flag.

---

## Stage 1: The Encoding Mismatch (CVE-2025-1094)
To download the hall ticket, the application requires the user to have an attendance record of 75% or higher. To bypass this, we must exploit an SQL injection vulnerability in the `/hallticket` POST endpoint. 

The CVE mentions an encoding mismatch, which enables an encoding-based SQL injection, where malformed multibyte characters (like `\xa5'`) bypass standard escaping mechanisms.

The chal also enforces a regex check to ensure the payload contains a specific `WHERE` clause structure (`where session_token =`). We can craft an `UPDATE` statement that fulfills this requirement and sets our attendance to 100.

**Exploit Payload:**
```bash
curl 'http://localhost:3000/hallticket' \
  -H 'Content-Type: application/json' \
  --cookie "session_token=<YOUR_TOKEN>" \
  --data-binary $'{"roll": "<YOUR_ROLL>\xa5\' ; UPDATE students SET attendance=100 WHERE session_token=\'<YOUR_TOKEN>\'; --"}'
```
(Note: Replace `<YOUR_TOKEN>` and `<YOUR_ROLL>` with the values provided by the initial session cookie and `/hallticket` GET request).

---

## Stage 2: The Throttled Downloads
Now that our attendance is sufficient, we can hit the `/download-ticket` endpoint. 

However, the server pads the PDF file to 2MB and intentionally throttles the download process by sleeping for 5 seconds between small data chunks, meaning a full download would take a long time (around 35 minutes). 

Because the actual PDF content is at the very beginning of the file (before the blank padding), we can use a range request to instantly grab just the bytes we need. 

**Exploit Payload:**
```bash
curl -v -r 0-4000 \
     -b "session_token=<YOUR_TOKEN>" \
     -o hall_ticket.pdf \
     http://localhost:3000/download-ticket
```

Upon inspecting the successfully downloaded PDF, there is a string of hidden text at the bottom: `L2FkbWluL3Byb2Nlc3Mtam9i`. Decoding this base64 string reveals an internal endpoint: `/admin/process-job`.

---

## Stage 3: Injecting the PDF (Stored XSS)
The application allows users to upload their verified PDF to be printed. 
* When a valid PDF is uploaded to `/print-upload`, it triggers a Puppeteer bot (`bot.js`) to view the document.
* The bot views the document at the `/view/<name>` endpoint.
* The `/view/<name>` endpoint extracts the `/Title` metadata from the PDF and renders it directly inside an HTML `<div>` tag without any sanitization. 

This allows for Stored XSS. 

Our goal is to force the admin bot to send a POST request to the hidden `/admin/process-job` endpoint we discovered earlier. This internal route verifies that the requester is `127.0.0.1` and expects a JSON payload of `{"count": 100}` to clear the user's print queue. The exact queue count can be realized from the header of the chal's landing webpage.

We can use a short Python script to inject a malicious HTML/JS payload directly into the `/Title` metadata of our downloaded PDF. The script must also preserve the original `/Keywords` signature (`pdf_soooo_fun_also_pctf26_is_goated`) so the upload endpoint accepts it.

---

## Stage 4: Execution and Flag Retrieval
1. Run the `exploit.py` script to generate `exploit.pdf`.
2. Upload `exploit.pdf` to the `/print-upload` endpoint.
3. The server will launch the Puppeteer bot, which visits the preview page and executes our injected JavaScript.
4. The bot's request successfully hits `/admin/process-job` from `127.0.0.1` with the correct JSON body, setting your session's queue count to `0`.
5. Finally, make a GET request to `/queue-status`. Because the queue is now empty, the server returns the success message and the flag.

**Resulting Flag:**
`p_ctf{Wh0_nEed$_h@!!_Ti(kEt$_anYW@Y}`
