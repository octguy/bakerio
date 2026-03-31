package mq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

func SetupTopology(ch *amqp.Channel) error {
	// Single topic exchange for all app events
	if err := ch.ExchangeDeclare(
		"bakerio.events", "topic", true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}

	// Queue: user notifications (welcome email, verification, etc.)
	if _, err := ch.QueueDeclare(
		"user.notifications", true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("declare user.notifications queue: %w", err)
	}

	if err := ch.QueueBind(
		"user.notifications", "user.#", "bakerio.events", false, nil,
	); err != nil {
		return fmt.Errorf("bind user.notifications: %w", err)
	}

	// Add more queues here as modules grow:
	// "order.notifications" bound to "order.#"
	// "payment.notifications" bound to "payment.#"

	return nil
}
