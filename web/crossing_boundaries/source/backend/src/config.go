package app

import (
	"os"
)

type Config struct {
	Flag           string
	UpstreamAddr   string
	ListenAddr     string
	AdminSessionID string
	HostName       string
}

func LoadConfig() (*Config, error) {
	cfg := &Config{
		Flag:           getenv("FLAG", "CTF{test_flag_replace_me}"),
		UpstreamAddr:   getenv("UPSTREAM_ADDR", "http://localhost:3000"),
		ListenAddr:     getenv("LISTEN_ADDR", "localhost:3002"),
		AdminSessionID: getenv("ADMIN_SESSION_ID", "123"),
		HostName:       getenv("HOST_NAME", "localhost"),
	}

	return cfg, nil
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
