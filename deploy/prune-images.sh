#!/usr/bin/env sh
# Scheduled Docker image housekeeping for the bakerio VPS.
# Removes unused images older than 7 days. Images referenced by a running
# container are always kept, so this never touches the live stack or recent
# rollback targets. Installed as a daily cron job by the CD deploy steps.
set -eu
docker image prune -af --filter "until=168h"
