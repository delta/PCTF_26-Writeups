package main

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

const (
	maxBodyBytes = 1 << 20 // 1MB
	maxLineBytes = 8192    // Increased for long headers
	maxHeaders   = 100     // Prevent header bomb
)

var (
	ErrBadRequestLine   = errors.New("malformed request line")
	ErrBadHeaderLine    = errors.New("malformed header line")
	ErrBadContentLength = errors.New("invalid content-length")
	ErrBodyTooLarge     = errors.New("body too large")
	ErrUnsupportedTE    = errors.New("transfer-encoding not supported")
	ErrTooManyHeaders   = errors.New("too many headers")
	ErrLineTooLong      = errors.New("line too long")
	ErrDuplicateCL      = errors.New("duplicate content-length")
	ErrInvalidMethod    = errors.New("invalid http method")
	ErrInvalidProtocol  = errors.New("invalid http protocol")
)

type Header struct {
	Key string
	Val string
}

type Request struct {
	Method     string
	Path       string
	Query      string
	Protocol   string
	Headers    []Header
	ContentLen int
	RawLine    string
}

func ReadRequestHeaders(r *bufio.Reader) (*Request, error) {
	line, err := readLine(r)
	if err != nil {
		return nil, err
	}

	parts := strings.SplitN(line, " ", 3)
	if len(parts) != 3 {
		return nil, ErrBadRequestLine
	}

	method := strings.ToUpper(parts[0])
	if !isValidMethod(method) {
		return nil, ErrInvalidMethod
	}

	pathAndQuery := parts[1]
	path := pathAndQuery
	query := ""

	if idx := strings.IndexByte(pathAndQuery, '?'); idx != -1 {
		path = pathAndQuery[:idx]
		query = pathAndQuery[idx+1:]
	}

	protocol := parts[2]
	if !isValidProtocol(protocol) {
		return nil, ErrInvalidProtocol
	}

	req := &Request{
		Method:     method,
		Path:       path,
		Query:      query,
		Protocol:   protocol,
		RawLine:    line,
		ContentLen: 0,
	}

	seenCL := false
	for _ = range maxHeaders {
		h, err := readLine(r)
		if err != nil {
			return nil, err
		}
		if h == "" {
			break
		}

		colon := strings.IndexByte(h, ':')
		if colon == -1 || colon == 0 {
			return nil, ErrBadHeaderLine
		}

		key := strings.ToLower(strings.TrimSpace(h[:colon]))
		val := strings.TrimSpace(h[colon+1:])

		if key == "transfer-encoding" {
			return nil, ErrUnsupportedTE
		}

		if key == "content-length" {
			if seenCL {
				return nil, ErrDuplicateCL
			}
			n, err := strconv.Atoi(val)
			if err != nil || n < 0 {
				return nil, ErrBadContentLength
			}
			if n > maxBodyBytes {
				return nil, ErrBodyTooLarge
			}
			req.ContentLen = n
			seenCL = true
		}

		req.Headers = append(req.Headers, Header{Key: key, Val: val})
	}

	if len(req.Headers) >= maxHeaders {
		return nil, ErrTooManyHeaders
	}

	return req, nil
}

func ReadRequestBody(r *bufio.Reader, cl int) ([]byte, error) {
	if cl < 0 {
		return nil, ErrBadContentLength
	}
	if cl == 0 {
		return nil, nil
	}
	if cl > maxBodyBytes {
		return nil, ErrBodyTooLarge
	}

	body := make([]byte, cl)
	n, err := io.ReadFull(r, body)
	if err != nil {
		return nil, err
	}
	if n != cl {
		return nil, io.ErrUnexpectedEOF
	}

	return body, nil
}

func (r *Request) Raw(body []byte) []byte {
	var b bytes.Buffer

	b.WriteString(r.RawLine)
	b.WriteString("\r\n")

	for _, h := range r.Headers {
		b.WriteString(h.Key)
		b.WriteString(": ")
		b.WriteString(h.Val)
		b.WriteString("\r\n")
	}

	b.WriteString("\r\n")

	if len(body) > 0 {
		b.Write(body)
	}

	return b.Bytes()
}

func (r *Request) CacheKey() string {
	k := fmt.Sprintf("%s:%s", strings.ToUpper(r.Method), r.Path)
	if r.Query != "" {
		k += "?" + r.Query
	}
	return k
}

func readLine(r *bufio.Reader) (string, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return "", err
	}

	if len(line) > maxLineBytes {
		return "", ErrLineTooLong
	}

	return strings.TrimRight(line, "\r\n"), nil
}

func isValidMethod(method string) bool {
	switch method {
	case "GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE", "CONNECT":
		return true
	default:
		return false
	}
}

func isValidProtocol(proto string) bool {
	return proto == "HTTP/1.0" || proto == "HTTP/1.1"
}
