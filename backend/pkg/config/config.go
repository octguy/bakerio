package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server ServerConfig
	JWT    JWTConfig
	DB     DatabaseConfig
	Logger LoggerConfig
}

type ServerConfig struct {
	Env  string
	Port string
	Mode string
}

type JWTConfig struct {
	SecretKey string
	Expiry    time.Duration
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type LoggerConfig struct {
	Development       bool
	DisableCaller     bool
	DisableStacktrace bool
	Encoding          string
	Level             string
}

func Load() *Config {
	godotenv.Load() // Load .env file if it exists

	jwtExpiry, err := time.ParseDuration(os.Getenv("JWT_EXPIRY"))
	if err != nil {
		jwtExpiry = 15 * time.Minute // Default to 15 minutes if parsing fails
	}

	return &Config{
		Server: ServerConfig{
			Env:  os.Getenv("SERVER_ENV"),
			Port: os.Getenv("SERVER_PORT"),
			Mode: os.Getenv("GIN_MODE"),
		},
		JWT: JWTConfig{
			SecretKey: os.Getenv("JWT_SECRET"),
			Expiry:    jwtExpiry,
		},
		DB: DatabaseConfig{
			Host:     os.Getenv("DB_HOST"),
			Port:     os.Getenv("DB_PORT"),
			User:     os.Getenv("DB_USER"),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     os.Getenv("DB_NAME"),
			SSLMode:  os.Getenv("DB_SSLMODE"),
		},
	}
}

// Datasource name build
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DB.Host, c.DB.Port, c.DB.User, c.DB.Password, c.DB.Name, c.DB.SSLMode,
	)
}
