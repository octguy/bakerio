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

	// Queue: user notifications (welcome email + OTP).
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

	// Queue: order events (order.placed today, more later). Consumer fans
	// out to customer (in-app + email receipt) + branch staff (in-app each).
	if _, err := ch.QueueDeclare(
		"order.notifications", true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("declare order.notifications queue: %w", err)
	}
	if err := ch.QueueBind(
		"order.notifications", "order.#", "bakerio.events", false, nil,
	); err != nil {
		return fmt.Errorf("bind order.notifications: %w", err)
	}

	// Queue: auth security events (password_changed + password_reset_by_admin).
	if _, err := ch.QueueDeclare(
		"auth.notifications", true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("declare auth.notifications queue: %w", err)
	}
	if err := ch.QueueBind(
		"auth.notifications", "auth.#", "bakerio.events", false, nil,
	); err != nil {
		return fmt.Errorf("bind auth.notifications: %w", err)
	}

	// Queue: membership events (tier_upgraded today, birthday/expiring later).
	if _, err := ch.QueueDeclare(
		"membership.notifications", true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("declare membership.notifications queue: %w", err)
	}
	if err := ch.QueueBind(
		"membership.notifications", "membership.#", "bakerio.events", false, nil,
	); err != nil {
		return fmt.Errorf("bind membership.notifications: %w", err)
	}

	return nil
}
