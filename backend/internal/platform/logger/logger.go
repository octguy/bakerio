package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

func Init(env string) error {
	var cfg zap.Config

	if env != "production" {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		cfg.EncoderConfig.TimeKey = "time"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		cfg.OutputPaths = []string{"stdout"}
		cfg.ErrorOutputPaths = []string{"stderr"}
	} else {
		cfg = zap.NewProductionConfig() // JSON, info level
	}

	var err error
	Log, err = cfg.Build(zap.AddStacktrace(zapcore.ErrorLevel))
	return err
}

func Sync() {
	_ = Log.Sync()
}
