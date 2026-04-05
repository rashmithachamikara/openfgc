FROM golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o /out/bff ./cmd/server

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /out/bff /app/bff
EXPOSE 8080
ENTRYPOINT ["/app/bff"]
