# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --filter frontend... --frozen-lockfile

FROM deps AS dev
COPY apps/frontend apps/frontend
RUN pnpm --filter frontend exec nuxt prepare
EXPOSE 3000
CMD ["pnpm", "--filter", "frontend", "dev"]

FROM dev AS build
RUN pnpm --filter frontend build

FROM node:22-bookworm-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
