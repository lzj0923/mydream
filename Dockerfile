FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY next.config.ts next-env.d.ts postcss.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CMS_API_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_CMS_API_URL=${NEXT_PUBLIC_CMS_API_URL}
ENV CMS_API_URL=http://cms:8080
ENV CMS_SITE_KEY=mydream
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && groupadd --system --gid 10001 mydream && useradd --system --uid 10001 --gid mydream mydream
COPY --from=build --chown=mydream:mydream /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=mydream:mydream /app/node_modules ./node_modules
COPY --from=build --chown=mydream:mydream /app/.next ./.next
COPY --from=build --chown=mydream:mydream /app/public ./public
RUN mkdir -p /app/.data/pre-reviews && chown -R mydream:mydream /app/.data
USER mydream
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
