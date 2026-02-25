package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"sync"
	"time"
)

/* ===================== CONSTANTS ===================== */

const (
	LISTEN_ADDR = ":3000"

	BACKEND_SCHEME = "http"
	BACKEND_HOST   = "proxy:3001"

	COOKIE_NAME = "session"

	IDLE_CONN_TIMEOUT = 60 * time.Second
)

/* ===================== GLOBAL STATE ===================== */

// one ReverseProxy (== one Transport == one backend connection pool)
// per cookie value
var (
	defaultProxy = newSharedProxy()
	proxyMap   = make(map[string]*httputil.ReverseProxy)
	proxyMapMu sync.Mutex
	adminSessionToken = os.Getenv("ADMIN_SESSION_ID")
)

/* ===================== MAIN ===================== */

func main() {
	http.HandleFunc("/", handler)

	log.Println("listening on", LISTEN_ADDR)
	log.Fatal(http.ListenAndServe(LISTEN_ADDR, nil))
}

/* ===================== HANDLER ===================== */

func handler(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(COOKIE_NAME)
	if err != nil || c.Value == "" {
		fmt.Printf("Default conn for %s\n", r.RemoteAddr)
		defaultProxy.ServeHTTP(w, r)
		return
	}

	var p *httputil.ReverseProxy
	if c.Value == adminSessionToken {
		userSession := r.Header.Get("X-User-Session")
		p = getProxyForCookie(userSession)
		fmt.Printf("Admin conn for %s\n", r.RemoteAddr)
	} else {
		p = getProxyForCookie(c.Value)
		fmt.Printf("Reused conn %p for %s\n", p.Transport, r.RemoteAddr)
	}

	p.ServeHTTP(w, r)
}

/* ===================== PROXY MGMT ===================== */

func getProxyForCookie(cookie string) *httputil.ReverseProxy {
	proxyMapMu.Lock()
	defer proxyMapMu.Unlock()

	if p, ok := proxyMap[cookie]; ok {
		return p
	}

	p := newExclusiveProxy()
	proxyMap[cookie] = p
	return p
}

func newSharedProxy() *httputil.ReverseProxy {
	target := &url.URL{
		Scheme: BACKEND_SCHEME,
		Host:   BACKEND_HOST,
	}

	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:    IDLE_CONN_TIMEOUT,
		ForceAttemptHTTP2:  false,
	}

	p := httputil.NewSingleHostReverseProxy(target)
	p.Transport = transport
	return p
}

func newExclusiveProxy() *httputil.ReverseProxy {
	target := &url.URL{
		Scheme: BACKEND_SCHEME,
		Host:   BACKEND_HOST,
	}

	transport := &http.Transport{
		// this is the entire trick:
		// one transport == one connection pool
		// limits enforce exactly ONE backend conn
		MaxConnsPerHost:     1,
		MaxIdleConns:        1,
		MaxIdleConnsPerHost: 1,

		IdleConnTimeout:   IDLE_CONN_TIMEOUT,
		DisableKeepAlives: false,
		ForceAttemptHTTP2: false,
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = transport

	return proxy
}
