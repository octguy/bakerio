package main

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/octguy/bakerio/backend/internal/platform/cache"
	"github.com/octguy/bakerio/backend/internal/platform/database"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/platform/outbox"
	"github.com/octguy/bakerio/backend/internal/platform/storage"
	"github.com/octguy/bakerio/backend/pkg/config"
	"github.com/octguy/bakerio/backend/pkg/txmanager"
	"go.uber.org/zap"
)

// infra holds long-lived infrastructure clients plus the shared services
// modules depend on. Built once at boot, closed once at shutdown.
type infra struct {
	pool        *pgxpool.Pool
	redis       *cache.Client
	rmq         *mq.RabbitMQ
	objectStore *storage.Client

	tx         *txmanager.TxManager
	publisher  *mq.Publisher
	consumer   *mq.Consumer
	authOutbox *outbox.Repository
	otpService *otp.Service
}

// setupInfra connects to every external dependency. Any failure here is fatal —
// the app has nothing useful to do without its data plane.
func setupInfra(ctx context.Context, cfg *config.Config) *infra {
	pool, err := database.Connect(ctx, cfg.DSN())
	must("database connect", err)

	redisClient, err := cache.NewClient(cfg.Redis)
	must("redis connect", err)

	rmq, err := mq.NewRabbitMQ(cfg.MQ.URL, logger.Log)
	must("rabbitmq connect", err)
	setupMQTopology(rmq)

	// MinIO is lazy — this just constructs the client; the bucket is ensured on
	// first image upload. App boots fine without MinIO running.
	objectStore, err := storage.New(cfg.Storage)
	must("storage init", err)

	return &infra{
		pool:        pool,
		redis:       redisClient,
		rmq:         rmq,
		objectStore: objectStore,

		tx:         txmanager.New(pool),
		publisher:  mq.NewPublisher(rmq),
		consumer:   mq.NewConsumer(rmq, logger.Log),
		authOutbox: outbox.NewRepository(pool, "auth.outbox"),
		otpService: otp.NewService(redisClient),
	}
}

// setupMQTopology opens a one-shot channel to declare exchanges/queues, then
// closes it. Topology survives across reconnects.
func setupMQTopology(rmq *mq.RabbitMQ) {
	ch, err := rmq.Channel()
	must("rabbitmq channel", err)
	defer func() {
		if err := ch.Close(); err != nil {
			logger.Log.Warn("rabbitmq channel close", zap.Error(err))
		}
	}()
	must("rabbitmq topology", mq.SetupTopology(ch))
}

// Close shuts infrastructure down in reverse order of init. Errors are logged
// rather than returned — shutdown is best-effort.
func (i *infra) Close() {
	if err := i.rmq.Close(); err != nil {
		logger.Log.Warn("rabbitmq close", zap.Error(err))
	}
	if err := i.redis.Close(); err != nil {
		logger.Log.Warn("redis close", zap.Error(err))
	}
	i.pool.Close()
}
