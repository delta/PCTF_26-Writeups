package main

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"strconv"
	"strings"
)

type Response struct {
	Status int
	b      bytes.Buffer
}

func ReadResponse(c io.Reader) (*Response, error) {
	r := bufio.NewReader(c)
	var resp Response

	statusLine, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	resp.b.WriteString(statusLine)

	parts := strings.Fields(statusLine)
	if len(parts) < 2 {
		return nil, errors.New("invalid status line")
	}
	resp.Status, err = strconv.Atoi(parts[1])
	if err != nil {
		return nil, errors.New("invalid status code")
	}

	cl := 0
	for {
		h, err := r.ReadString('\n')
		if err != nil {
			return nil, err
		}
		resp.b.WriteString(h)

		h = strings.TrimRight(h, "\r\n")
		if h == "" {
			break
		}

		if strings.HasPrefix(strings.ToLower(h), "content-length:") {
			v := strings.TrimSpace(strings.SplitN(h, ":", 2)[1])
			cl, _ = strconv.Atoi(v)
		}
	}

	if cl < 0 {
		return nil, errors.New("invalid response content-length")
	}

	if cl > 0 {
		body := make([]byte, cl)
		if _, err := io.ReadFull(r, body); err != nil {
			return nil, err
		}
		resp.b.Write(body)
	}

	return &resp, nil
}

func (r *Response) Bytes() []byte {
	return r.b.Bytes()
}

func AddCacheHeaders(resp []byte, key string, isHit bool) []byte {
	hitStatus := "MISS"
	if isHit {
		hitStatus = "HIT"
	}

	keyHeader := "X-Cache-Key: " + key + "\r\n"
	hitHeader := "X-Cache: " + hitStatus + "\r\n"

	// Find end of status line
	i := bytes.Index(resp, []byte("\r\n"))
	if i == -1 {
		return resp // Malformed response, return as-is
	}

	var b bytes.Buffer
	b.Write(resp[:i+2])           // Status line
	b.WriteString(hitHeader)       // Cache status header
	b.WriteString(keyHeader)       // Cache key header
	b.Write(resp[i+2:])           // Rest of headers + body

	return b.Bytes()
}
