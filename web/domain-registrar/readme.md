# Domain Registrar chal - Write-up

## Challenge Summary
This challenge features a domain purchasing landing site that requires a KYC photo upload. By reading client-side JS script, attackers discover a hidden parameter vulnerable to LFI and SSRF. Chaining these vulnerabilities allows attackers to enumerate internal virtual hosts, leak a reverse proxy configuration, and ultimately achieve RCE via a constrained image upload.

## Stage 1: LFI
Initial interaction with the chal reveals a "check availability" feature for various domain names.
* Examining `app.js` reveals the application interacts with `avlbl.php` to fetch domain statuses.
* Examining frontend code reveals the `list=` parameter in `avlbl.php`.
* Supplying standard local file paths to this parameter (e.g., `avlbl.php?list=/etc/hosts`) successfully reads local files.
* Reading `/etc/hosts` yields a list of custom domains all mapped to `127.0.0.1`.

## Stage 2: Internal SSRF & Virtual Host Routing
The `avlbl.php` script handles URLs starting with `http` differently.
* It constructs an internal URL (`http://127.0.0.1/ssrf` + path) and executes a request to the hostname provided in the `list` parameter.
* By iterating through the domains found in `/etc/hosts` via the SSRF (e.g., `avlbl.php?list=http://notflix.com`), we can dump various internal files.
* Querying the `notflix.com` domain returns `nginx.conf.bak`, the internal reverse proxy configuration.
* Querying `twitter.x` returns an image file (`flAg_!$_dEf|nitELy_heRe.jpeg`) depicting a cat and the Nginx logo, serving as a hint for the final payload.
* Querying ```chrome.ram``` returns an image file which shows the file format stored by the server of the image uploaded by the user. 
* Querying ```novidia.gpu``` returns a bash script that moves files from public to backup routinely. This is likely part of a cronjob.

## Stage 3: Nginx Misconfiguration & KYC Upload
The leaked `nginx.conf.bak` reveals a critical misconfiguration.
* Within the `/public/` location block, any file ending in an image extension (`.jpg`, `.jpeg`, `.png`, `.gif`) is passed directly to PHP-FPM (`fastcgi_pass 127.0.0.1:9000`). This means if we can get a PHP payload into an image file in this directory, the server will execute it.
* The KYC upload feature (`kyc.php`) handles our user-supplied images. By default, it saves files to a safe `/app/backup/` directory. 
* However, if the uploaded file's original name begins with a dot (as a hidden file), the script routes it to the executable `/app/public/` directory instead. As an added bonus, hidden files (starting with `.`) are ignored by a cronjob we discovered earlier.


## Stage 4: Bypassing the Payload Filter (RCE)
We cannot just upload any PHP shell. The `kyc.php` script implements a strict content filter. Combining this logic with the hint from the `twitter.x` image (a cat + Nginx logo), we know our RCE payload must strictly be `system('cat nginx.conf')`.

### Exploit Execution
1. Create a file named `.payload.jpeg`.
2. Insert the required PHP payload into the file (as raw text):
   `<?php system('cat nginx.conf'); ?>`
3. Upload this file via the KYC form at `kyc.php`. The server will return a `Unique ID` for the user.
4. The file is now saved as `/app/public/.payload_<UNIQUE_ID>.jpeg`.
5. Trigger the payload by navigating directly to the file in the browser, to execute the PHP and read the PHP output (which contains the flag).

## Full Flag
`p_ctf{c@n_nEVer_%ru$T_D0M@!nS_FR0m_p0Ps}`
