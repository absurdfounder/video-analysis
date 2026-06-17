FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 \
  && rm -rf /var/lib/apt/lists/*

COPY app/package*.json ./app/
RUN npm --prefix app ci --omit=dev

COPY app ./app
RUN npm --prefix app run install-ytdlp

ENV NODE_ENV=production
ENV PATH="/app/app/bin:${PATH}"

EXPOSE 3000

CMD ["npm", "--prefix", "app", "start"]
