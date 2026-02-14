FROM alpine:3.18

RUN apk add --no-cache unzip wget libc6-compat

WORKDIR /app

# Download PocketBase Linux AMD64 binary
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.36.2/pocketbase_0.36.2_linux_amd64.zip \
    && unzip pocketbase_0.36.2_linux_amd64.zip \
    && rm pocketbase_0.36.2_linux_amd64.zip \
    && chmod +x pocketbase

EXPOSE 8090

CMD ["./pocketbase", "serve", "--dir", "/app/pb_data", "--http", "0.0.0.0:8090"]
