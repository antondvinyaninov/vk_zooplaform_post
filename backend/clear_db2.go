package main

import (
	"backend/config"
	"backend/database"
	"fmt"
	"log"
)

func main() {
	cfg := config.Load()
	if err := database.Init(cfg.DatabaseURL); err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	res, err := database.Exec("DELETE FROM parsed_groups")
	if err != nil {
		log.Fatal(err)
	}
	rows, _ := res.RowsAffected()
	fmt.Printf("Deleted %d rows from parsed_groups\n", rows)
}
