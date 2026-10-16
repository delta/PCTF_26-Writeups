package main

import (
	"log"

	app "github.com/delta/chal2/src"
)

func main() {
	cfg, err := app.LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	app, err := app.NewApp(cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer app.DB.Close()

	log.Printf("[backend] Listening on %s", cfg.ListenAddr)
	log.Fatal(app.ListenAndServe())
}
