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
	MQ     RabbitMQConfig
	Redis  RedisConfig
	Email  SMTPConfig
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

type RabbitMQConfig struct {
	URL string
}

type RedisConfig struct {
	Address  string
	Password string
	DB       int
}

type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

func Load() *Config {
	_ = godotenv.Load()

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
		MQ: RabbitMQConfig{
			URL: os.Getenv("RABBITMQ_URL"),
		},
		Redis: RedisConfig{
			Address:  os.Getenv("REDIS_ADDR"),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       0,
		},
		Email: SMTPConfig{
			Host:     os.Getenv("EMAIL_HOST"),
			Port:     os.Getenv("EMAIL_PORT"),
			User:     os.Getenv("EMAIL_USER"),
			Password: os.Getenv("EMAIL_PASSWORD"),
			From:     os.Getenv("EMAIL_FROM"),
		},
	}
}

// DSN is Datasource name build
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DB.Host, c.DB.Port, c.DB.User, c.DB.Password, c.DB.Name, c.DB.SSLMode,
	)
}
