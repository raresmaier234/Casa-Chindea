FROM alpine:3.18

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY pocketbase /app/pocketbase
RUN chmod +x /app/pocketbase

COPY pb_data /app/pb_data
COPY pb_migrations /app/pb_migrations

VOLUME ["/app/pb_data"]
EXPOSE 8090

CMD ["./pocketbase", "serve", "--dir", "/app/pb_data", "--http", "0.0.0.0:8090"]