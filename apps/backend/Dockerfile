# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --filter backend... --frozen-lockfile

FROM deps AS dev
COPY apps/backend apps/backend
RUN pnpm --filter backend exec prisma generate
EXPOSE 3001
CMD ["pnpm", "--filter", "backend", "dev"]

FROM dev AS build
RUN pnpm --filter backend build

FROM node:24-bookworm-slim AS prod
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/backend
EXPOSE 3001
CMD ["node", "dist/main.js"]
