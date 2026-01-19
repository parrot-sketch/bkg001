# Docker Cleanup Guide

## Overview

Before setting up the Nairobi Sculpt database, it's important to clean up any existing Docker containers, volumes, and networks that might cause conflicts.

## Quick Cleanup

Run the automated cleanup script:

```bash
npm run docker:cleanup
```

Or manually:

```bash
bash scripts/docker-cleanup.sh
```

## What Gets Cleaned Up

The cleanup script removes:

1. **Containers**:
   - `nairobi-sculpt-db` - Previous database container
   - `nairobi-sculpt-cache` - Previous cache container

2. **Volumes**:
   - `nairobi-sculpt_postgres_data` - Previous database volume
   - `ns_postgres_data` - Alternative database volume

3. **Networks**:
   - `nairobi-sculpt_nairobi-network` - Previous network
   - `nairobi-sculpt-network` - Alternative network

## Port Conflict Resolution

The cleanup script checks for port conflicts:

- **Port 5432**: Used by `ehr-postgres` (other project)
- **Port 5433**: Used by our new database (to avoid conflicts)

If port 5433 is already in use, the script will warn you.

## Manual Cleanup

If you need to manually clean up:

### Stop and Remove Containers

```bash
# Stop containers
docker stop nairobi-sculpt-db nairobi-sculpt-cache 2>/dev/null || true

# Remove containers
docker rm nairobi-sculpt-db nairobi-sculpt-cache 2>/dev/null || true
```

### Remove Volumes

```bash
# Remove volumes (WARNING: This deletes all data!)
docker volume rm nairobi-sculpt_postgres_data ns_postgres_data 2>/dev/null || true
```

### Remove Networks

```bash
# Remove networks
docker network rm nairobi-sculpt_nairobi-network nairobi-sculpt-network 2>/dev/null || true
```

## Verify Cleanup

After cleanup, verify:

```bash
# Check containers
docker ps -a | grep nairobi

# Check volumes
docker volume ls | grep nairobi

# Check networks
docker network ls | grep nairobi

# Check ports
docker ps --format "{{.Names}}:{{.Ports}}" | grep "5433"
```

## After Cleanup

Once cleanup is complete:

1. **Update `.env` file**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
   DB_PORT=5433
   ```

2. **Start new database**:
   ```bash
   npm run docker:up
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Seed database**:
   ```bash
   npm run db:seed
   ```

## Troubleshooting

### Volume Won't Delete

If a volume is in use by a running container:

```bash
# Stop the container first
docker stop <container-name>

# Then remove the volume
docker volume rm <volume-name>
```

### Network Won't Delete

If a network is in use:

```bash
# Remove containers using the network first
docker ps -a --filter "network=<network-name>" --format "{{.ID}}" | xargs docker rm -f

# Then remove the network
docker network rm <network-name>
```

### Port Already in Use

If port 5433 is already in use:

1. Find the container using the port:
   ```bash
   docker ps --format "{{.Names}}:{{.Ports}}" | grep "5433"
   ```

2. Either:
   - Stop that container
   - Change `DB_PORT` in `.env` to a different port (e.g., 5434)
   - Update `docker-compose.yml` to use a different port
