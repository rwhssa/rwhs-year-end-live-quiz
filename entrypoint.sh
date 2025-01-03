#!/bin/bash
set -e

echo "Running database migrations..."
bun prisma migrate dev --name init
bun prisma generate
#bun prisma migrate deploy

echo "Running database seeding..."
bun seed

echo "Starting application..."
exec "$@"