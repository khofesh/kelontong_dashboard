# kelontong dashboard

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
