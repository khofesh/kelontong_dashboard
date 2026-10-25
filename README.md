# kelontong dashboard

## dev on local

run db

```shell
docker compose up -d --wait db
docker compose ps
docker compose logs --tail 20 db
```

migrate db

```shell
pnpm --filter backend db:migrate:dev --name init
```

run dev (backend and frontend)

```shell
pnpm run dev
```

adding a package to backend

```shell
pnpm --filter backend add express@^5.2.1
```

smoke test all endpoints

```shell
pnpm --filter backend test:endpoints
```
