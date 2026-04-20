FROM golang:1.23 AS builder
WORKDIR /app
COPY . .
RUN go mod download && go build -o /out/bff ./cmd/server

FROM gcr.io/distroless/base-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/bff /app/bff
EXPOSE 8080
ENTRYPOINT ["/app/bff"]
