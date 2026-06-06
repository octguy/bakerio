package mq

import (
	"context"

	"go.uber.org/zap"
)

// HandlerFunc receives the AMQP routing key alongside the body so a single
// handler attached to a wildcard-bound queue (e.g. "auth.#") can fan out
// to per-event-type sub-handlers without declaring a queue per event.
type HandlerFunc func(ctx context.Context, routingKey string, body []byte) error

type Consumer struct {
	rmq    *RabbitMQ
	logger *zap.Logger
}

func NewConsumer(rmq *RabbitMQ, logger *zap.Logger) *Consumer {
	return &Consumer{rmq: rmq, logger: logger}
}

func (c *Consumer) Consume(ctx context.Context, queue string, handler HandlerFunc) error {
	ch, err := c.rmq.Channel()
	if err != nil {
		return err
	}

	err = ch.Qos(1, 0, false)
	if err != nil {
		return err
	} // fair dispatch

	msgs, err := ch.Consume(queue, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		defer ch.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-msgs:
				if !ok {
					return
				}
				if err := handler(ctx, msg.RoutingKey, msg.Body); err != nil {
					c.logger.Error("consumer: handler failed, nacking",
						zap.String("queue", queue),
						zap.Error(err),
					)
					err := msg.Nack(false, true)
					if err != nil {
						return
					} // requeue
					continue
				}
				err := msg.Ack(false)
				if err != nil {
					return
				}
			}
		}
	}()

	return nil
}
