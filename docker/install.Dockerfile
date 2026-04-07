FROM oven/bun:1

WORKDIR /app

COPY install ./install
COPY script/install-server.ts ./script/install-server.ts

ENV PORT=3000

EXPOSE 3000

CMD ["bun", "script/install-server.ts"]
