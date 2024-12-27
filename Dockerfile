FROM oven/bun:latest

WORKDIR /app

COPY . .

# Install all dependencies (including prisma)
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bun prisma generate

# Build application
RUN bun build --compile --minify --sourcemap --bytecode src/index.ts --outfile ukhsc-system-api

# Add EntryPoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["./ukhsc-system-api"]