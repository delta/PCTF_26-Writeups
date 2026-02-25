# The Note Keeper

## TL;DR
This challenge chains together multiple low-severity issues in a Next.js application to achieve server-side code execution.
By abusing a middleware authentication bypass and a header reflection bug, an attacker can trigger an SSRF to an internal service, resulting in flag disclosure.

## Given files
- No source code, but snippets in admin notes.
- Hint: The application relies on middleware to decide who is allowed to access /admin. Can you bypass it?
- Hint: Next.js middleware acts like a proxy. What if there was an SSRF vulnerability related to request headers being passed to Response.next?

## Application Overview
- Users can take notes in a web interface.

- Notes for normal users are stored in localStorage.

- There's a login button with state pointing to /admin
- Login page doesn't work, seems like login feature is NOT implemented based on the digest
- /admin is protected:
    - 401 Unauthorized for unauthenticated users and the response hints `<!--Request Forbidden by Next.js 15.1.1 Middleware-->`

## Step 1: Middleware Bypass
- CVE-2025-29927 Next.js middleware bypass
- For version > 13.2.0, use `x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware`
- Add this header to `GET HTTP/1.1 /admin` request and you should see the admin panel
- Observation: the admin page is periodically making request to `backend:4000` service and this request is failing (this might be an internal service).

## Step 2: SSRF via Next.js Bug
- Observation: the pastebin link for middleware code is given.
- Next.js CVE-2025-57822
```js
return NextResponse.next({
  headers: req.headers
})
```
Because the middleware reflects headers, supplying a crafted Location header causes Next.js to perform an internal request.
By setting:
`Location: http://backend:4000/`

and including JavaScript payload in the request body, the server performs an internal fetch to the backend service.
This results in server-side eval execution.

Tryout the URL `http://backend:4000/flag` and it gives the flag

## Impact
- Authentication bypass
- SSRF to internal services

## Final exploit
checkout exploid.md