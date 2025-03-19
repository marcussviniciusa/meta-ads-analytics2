#!/bin/bash

echo "Running database migrations..."

# Run the migrations using docker-compose
docker-compose exec -T postgres psql -U postgres -d metaads -f /app/sql/06_create_user_permissions_tables.sql

echo "Migrations completed successfully!"
