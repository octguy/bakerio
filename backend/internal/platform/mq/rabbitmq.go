package mq

import (
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

type RabbitMQ struct {
	conn   *amqp.Connection
	url    string
	logger *zap.Logger
}

func NewRabbitMQ(url string, logger *zap.Logger) (*RabbitMQ, error) {
	r := &RabbitMQ{url: url, logger: logger}
	if err := r.connect(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *RabbitMQ) connect() error {
	conn, err := amqp.Dial(r.url)
	if err != nil {
		return fmt.Errorf("rabbitmq: dial failed: %w", err)
	}
	r.conn = conn
	r.logger.Info("rabbitmq: connected")

	// Watch for unexpected close and reconnect
	go r.watchConnection()
	return nil
}

func (r *RabbitMQ) watchConnection() {
	reason, ok := <-r.conn.NotifyClose(make(chan *amqp.Error, 1))
	if !ok {
		return // graceful close, no reconnect needed
	}
	r.logger.Warn("rabbitmq: connection closed", zap.Any("reason", reason))
	r.reconnect()
}

func (r *RabbitMQ) reconnect() {
	for {
		time.Sleep(5 * time.Second)
		r.logger.Info("rabbitmq: attempting reconnect")
		if err := r.connect(); err != nil {
			r.logger.Warn("rabbitmq: reconnect failed, retrying", zap.Error(err))
			continue
		}
		return
	}
}

func (r *RabbitMQ) Channel() (*amqp.Channel, error) {
	return r.conn.Channel()
}

func (r *RabbitMQ) Close() error {
	return r.conn.Close()
}
