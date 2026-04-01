package mq

import (
	"context"
	"encoding/json"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Publisher struct {
	rmq *RabbitMQ
}

func NewPublisher(rmq *RabbitMQ) *Publisher {
	return &Publisher{rmq: rmq}
}

func (p *Publisher) Publish(ctx context.Context, routingKey string, payload any) error {
	ch, err := p.rmq.Channel()
	if err != nil {
		return fmt.Errorf("publisher: open channel: %w", err)
	}
	defer ch.Close()

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("publisher: marshal payload: %w", err)
	}

	return ch.PublishWithContext(ctx,
		"bakerio.events", // exchange — declared in SetupTopology
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
}
