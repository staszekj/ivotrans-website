# OpenTelemetry Stack - Wymagania DEV

## Architektura

```
┌──────────┐     ┌─────────────────┐     ┌────────────────┐
│ Browser  │────▶│  Nginx Ingress  │────▶│ OTel Collector │
└──────────┘     │                 │     └───────┬────────┘
                 │                 │             │
                 │  /api/telemetry─┼─────────────┘
                 │  /* ───────────►│ website
                 └─────────────────┘
                                         ┌───────┴───────┐
                                         ▼               ▼
                                    ┌─────────┐   ┌────────────┐
                                    │ Jaeger  │   │ Prometheus │
                                    └─────────┘   └─────┬──────┘
                                                        │
                                                        ▼
                                                  ┌─────────┐
                                                  │ Grafana │
                                                  └─────────┘
```

---

## Deploymenty

```yaml
deployments:
  - name: otel-collector
    image: otel/opentelemetry-collector-contrib:0.96.0
    ports: [4317, 4318, 8889]
    purpose: Zbiera traces i metrics z browsera, eksportuje do Jaeger/Prometheus

  - name: jaeger
    image: jaegertracing/all-in-one:1.54
    ports: [16686, 4317]
    purpose: Distributed tracing UI

  - name: prometheus
    image: prom/prometheus:v2.50.0
    ports: [9090]
    purpose: Metryki

  - name: grafana
    image: grafana/grafana:10.3.0
    ports: [3000]
    purpose: Dashboardy
```

---

## Ingress

```yaml
ingress:
  main:
    host: ivotrans.dev.local
    routes:
      - path: /api/telemetry
        backend: otel-collector:4318
        notes: Rewrite to /v1/traces, rate limit 10 rps
      - path: /
        backend: ivotrans-website:80

  tools:
    hosts:
      - jaeger.ivotrans.dev.local -> jaeger:16686
      - grafana.ivotrans.dev.local -> grafana:3000
      - prometheus.ivotrans.dev.local -> prometheus:9090
    auth: Basic Auth (admin:dev-tools-2026)
```

---

## Auth (DEV only)

```yaml
credentials:
  otel-collector:
    type: Basic Auth
    username: ivotrans
    password: dev-password-2026
    
  tools-access:
    type: Basic Auth  
    username: admin
    password: dev-tools-2026
```

---

## Connections

```yaml
connections:
  browser -> ingress/api/telemetry -> otel-collector:4318
  otel-collector -> jaeger:4317 (traces)
  otel-collector:8889 <- prometheus (scrape metrics)
  prometheus <- grafana (datasource)
  jaeger <- grafana (datasource)
```

---

## Endpoints

```yaml
endpoints:
  - https://ivotrans.dev.local              # strona
  - https://ivotrans.dev.local/api/telemetry # telemetria
  - https://jaeger.ivotrans.dev.local        # tracing UI
  - https://grafana.ivotrans.dev.local       # dashboardy
  - https://prometheus.ivotrans.dev.local    # metryki
```
