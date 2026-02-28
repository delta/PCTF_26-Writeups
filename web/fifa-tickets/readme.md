# Fifa-Tickets chal - Write-Up 

## Challenge Summary
The challenge presents a ticketing webpage exhibiting abnormal behavior. Users notice that available seats constantly change upon refreshing, and attempting to checkout results in an endless loop. Also, the VIP, Premium, Pro seats are always sold out, and Regular is the only zone that seems to have available seats. The objective is to recognize that the REST-gRPC proxy is malfunctioning, bypass it entirely, and write a client script to communicate directly with the backend gRPC server to reserve a VIP seat.

## Stage 1: The Broken Proxy
Upon initial interaction with the chal, a few key behaviors are noticed:

* The proxy drops a `session_token` into the user's cookies to validate them for a specific time limit.
* The `/api/seats` endpoint returns randomized availability, causing the abnormal page behavior.
* The `/api/buy` checkout endpoint is stuck in a race condition. Persisting network logs show the response of the ```buy``` endpoint, which reveals the URL of the backend service. 

## Stage 2: gRPC Reflection
Since the proxy is "malfunctioning", the logical next step is to interact directly with the gRPC backend. 

* The backend gRPC server has reflection enabled, which allows attackers to discover the available services and methods using a tool like `grpcurl`.
* By exploring the reflected schema, we can build the proto file of the methods that the backend uses.
* From the proto file, we can compile it into source code of any language using ```protoc```. Referencing the function from the generated source code, the attacker has to write a script which crafts the payload and sends it to the backend.  
* We find the path to exploitation lies in the `ReserveSeat` RPC method.
* Check ```solve.go``` for an idea of the solver script. 

## Stage 3: Crafting the Protobuf Payload

* To get the flag, the attacker must reserve a VIP seat, which maps to rows "A" and "B" (e.g., seat "A1").
* The `ReserveSeat` method requires a `ReserveSeatRequest` payload.
* This payload contains a `bytes request` field, which the backend unmarshals into an internal `ReserveSeatData` message.
* The `ReserveSeatData` structure requires the user's `sessionToken`, the `SeatZone` (which corresponds to `4` for VIP), and an HMAC `hash` of the seat name.
* The HMAC-SHA256 hash validates the seat and is generated using the hardcoded secret key `"portuguenese"`.


## Stage 4: The Exploit Client Script
Because protocol buffers are cross-language compatible, attackers must write a custom client script (in Python, Go, etc.) to handle the serialization and communication.

The exploitation flow goes like this:
1. **Acquire Session:** Grab a valid `session_token` from the proxy's cookies.
2. **Generate Hash:** Calculate the HMAC-SHA256 hash of a VIP seat name (like "A1") using the secret `"portuguenese"`.
3. **Construct Payload:** Build the `ReserveSeatData` message with the token, hash, and VIP zone (`SeatZone_VIP`).
4. **Serialize:** Marshal the `ReserveSeatData` into bytes and wrap it in a `ReserveSeatRequest`.
5. **Execute:** Send the request to the gRPC backend.
6. **Deserialize Response:** If the reservation is successful, the backend responds with a `ReserveSeatResponse` containing a `ticket_data` byte array.
7. **Extract Flag:** This byte array must be unmarshaled into a `ConfirmedTicket` message to reveal the flag.

## Full Flag
`p_ctf{whO_kNeW_sMuGGl!nG_W@$_E@sY}`
