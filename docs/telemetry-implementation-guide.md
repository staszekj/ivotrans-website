# ivotrans — Przewodnik implementacji telemetrii (browser + backend)

## Architektura

```
Browser  ──OTLP HTTP──▶  nginx Ingress  ──▶  OTel Collector :4318  ──▶  Jaeger (traces)
                         (rewrite, CORS,                             ──▶  Prometheus (metrics)
                          rate-limit)

Backend  ──OTLP gRPC──▶  OTel Collector :4317  ──▶  (to samo co wyżej)
         (in-cluster)
```

## Endpointy

| Źródło | Endpoint | Protokół | TLS | Auth |
|--------|----------|----------|-----|------|
| Browser | `https://ivotrans-dev.eltrue/api/telemetry` | OTLP HTTP | TLS (bez mTLS) | API key w headerze |
| Backend (in-cluster) | `otel-collector:4317` | OTLP gRPC | brak | brak |
| Backend (in-cluster, alternatywa) | `otel-collector:4318` | OTLP HTTP | brak | brak |

> **SDK sam dodaje ścieżkę** `/v1/traces` i `/v1/metrics` do URL. Konfiguruj URL exporter jako `https://ivotrans-dev.eltrue/api/telemetry` — nie dopisuj `/v1/traces` ręcznie.

> **Rewrite rule**: Ingress przepisuje `/api/telemetry(/|$)(.*)` → `/$2`, więc collector dostaje czyste `/v1/traces`.

---

## PUŁAPKA #1: API key z przeglądarki

Endpoint telemetryczny **nie ma mTLS** — każdy może wysłać dane. Zabezpiecz go API key w nagłówku HTTP.

### Jak to działa

Browser wysyła nagłówek z każdym requestem OTLP:

```
X-API-Key: <secret-token>
```

### Konfiguracja po stronie SDK (browser)

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: 'https://ivotrans-dev.eltrue/api/telemetry',
  headers: {
    'X-API-Key': 'TWÓJ_KLUCZ_API',
  },
});
```

### Gdzie walidować

**Opcja A — Ingress (nginx configuration-snippet):**

Dodaj do annotacji Ingress `ivotrans-main`:

```yaml
nginx.ingress.kubernetes.io/configuration-snippet: |
  if ($http_x_api_key != "TWÓJ_KLUCZ_API") {
    return 403;
  }
```

**Opcja B — OTel Collector (`bearertokenauth` extension):**

```yaml
extensions:
  bearertokenauth:
    token: "TWÓJ_KLUCZ_API"

receivers:
  otlp:
    protocols:
      http:
        auth:
          authenticator: bearertokenauth
```

> **Uwaga**: Opcja B wymaga nagłówka `Authorization: Bearer <token>` zamiast custom `X-API-Key`. Jeśli chcesz `X-API-Key` — użyj opcji A (ingress).

### Na co uważać

- API key **będzie widoczny** w źródle strony / Network tab. To jest akceptowalne — chroni przed przypadkowym spamem, nie przed zdeterminowanym atakującym. Rate-limiting na ingress jest drugą warstwą ochrony.
- Klucz trzymaj w **Kubernetes Secret**, nie hardcoduj w YAML. W frontend buildzie wstrzyknij przez zmienną środowiskową (np. `VITE_OTEL_API_KEY`).
- Pamiętaj o dodaniu `X-API-Key` do listy `cors-allow-headers` w Ingress, jeśli go tam nie ma. Aktualnie jest `"*"` w OTel Collector CORS, ale Ingress ma jawną listę — **dodaj `X-API-Key`**:

```yaml
nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-API-Key"
```

---

## PUŁAPKA #2: Prefix metryk `ivotrans_`

Eksporter Prometheus w OTel Collector ma `namespace: ivotrans`. Każda metryka wysłana przez OTLP dostaje automatyczny prefix:

```
http_requests_total  →  ivotrans_http_requests_total   (w Prometheus)
translation_duration_seconds  →  ivotrans_translation_duration_seconds
```

**Konsekwencja**:
- W kodzie aplikacji (SDK) nazywaj metryki **BEZ prefixu** (`http_requests_total`)
- W dashboardach Grafana, alertach i PromQL zawsze używaj **`ivotrans_*`**
- Nie dodawaj prefixu ręcznie w kodzie — będzie podwójny (`ivotrans_ivotrans_...`)

---

## PUŁAPKA #3: CORS — tylko `https://ivotrans-dev.eltrue`

CORS jest skonfigurowany w **dwóch niezależnych miejscach**:

| Miejsce | Konfiguracja |
|---------|-------------|
| **Ingress** (annotacja) | `cors-allow-origin: "https://ivotrans-dev.eltrue"` |
| **OTel Collector** (ConfigMap) | `allowed_origins: ["https://ivotrans-dev.eltrue"]` |

Jeśli frontend działa na **innym originie** (np. `http://localhost:3000` podczas developmentu):
- Requesty telemetryczne z browsera będą **blokowane** przez CORS
- Musisz dodać origin do **obu miejsc** — Ingress i ConfigMap

---

## PUŁAPKA #4: Rate limiting na Ingress

```yaml
limit-rps: 10        # max 10 req/s
limit-connections: 5  # max 5 równoległych połączeń
limit-rpm: 600        # max 600 req/min
```

Zbyt agresywny batching z browsera trafi w limity i OTLP exporter dostanie `429`.

**Rekomendacja:**

```typescript
const spanProcessor = new BatchSpanProcessor(exporter, {
  scheduledDelayMillis: 5000,   // nie mniej niż 5s
  maxExportBatchSize: 100,      // nie 512 (default)
  maxQueueSize: 2048,
});
```

---

## PUŁAPKA #5: mTLS vs brak mTLS

| Ingress | Host | mTLS? |
|---------|------|-------|
| `ivotrans-main` | `ivotrans-dev.eltrue` | **NIE** — browser może wysyłać bez certyfikatu klienta |
| `ivotrans-jaeger` | `jaeger-ivotrans-dev.eltrue` | **TAK** — wymaga client cert (`eltrue-ca`) |
| `ivotrans-grafana` | `grafana-ivotrans-dev.eltrue` | **TAK** — wymaga client cert (`eltrue-ca`) |
| `ivotrans-prometheus` | `prometheus-ivotrans-dev.eltrue` | **TAK** — wymaga client cert (`eltrue-ca`) |

Backend wewnątrz klastra łączy się z `otel-collector` **bez TLS** (plaintext gRPC/HTTP).

---

## PUŁAPKA #6: Aggregation temporality

OTel Prometheus exporter wymaga **cumulative** temporality dla counterów i histogramów.

- Python/Go/Node SDK: domyślnie cumulative — OK
- **Browser** (`@opentelemetry/sdk-metrics`): domyślnie cumulative — OK
- Jeśli ktoś ustawi `AggregationTemporality.DELTA` — metryki **znikną** bez błędu

---

## Browser — implementacja

### Pakiety (npm)

```
@opentelemetry/api
@opentelemetry/sdk-trace-web
@opentelemetry/sdk-metrics              # opcjonalnie
@opentelemetry/resources
@opentelemetry/semantic-conventions
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/exporter-metrics-otlp-http  # opcjonalnie
@opentelemetry/instrumentation-fetch
@opentelemetry/instrumentation-document-load
@opentelemetry/instrumentation-user-interaction  # opcjonalnie
@opentelemetry/context-zone              # propagacja kontekstu przez Zone.js
```

### Minimalny setup

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

const exporter = new OTLPTraceExporter({
  url: 'https://ivotrans-dev.eltrue/api/telemetry',
  headers: {
    'X-API-Key': import.meta.env.VITE_OTEL_API_KEY,
  },
});

const provider = new WebTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'ivotrans-frontend',    // <-- WAŻNE: unikalna nazwa
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  scheduledDelayMillis: 5000,
  maxExportBatchSize: 100,
}));

provider.register({
  propagator: new W3CTraceContextPropagator(),   // <-- trace context w headerach fetch
});

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/ivotrans-dev\.eltrue/],  // <-- CORS propagation
    }),
    new DocumentLoadInstrumentation(),
  ],
});
```

### `sendBeacon` — flush przed zamknięciem strony

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    provider.forceFlush();
  }
});
```

> `forceFlush()` używa `navigator.sendBeacon` pod spodem (jeśli exporter to wspiera). Bez tego — spany z ostatniej interakcji użytkownika mogą się zgubić.

### Nie wysyłaj metryk z browsera jeśli niepotrzebne

Traces z `document-load` i `fetch` wystarczą na start. Metryki z browsera (Web Vitals itp.) dodaj dopiero gdy będą potrzebne — zmniejszy to ruch i złożoność.

---

## Backend — implementacja

### Protokół

Użyj **gRPC** (`otel-collector:4317`) — jest wydajniejszy niż HTTP wewnątrz klastra.

### `service.name`

```python
# Python przykład
resource = Resource.create({
    "service.name": "ivotrans-backend",   # <-- MUSI być inny niż frontend
    "service.version": "1.0.0",
    "deployment.environment": "dev",
})
```

### Context propagation (trace z browsera → backend)

```python
# Python (Flask/FastAPI)
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.textmap import W3CTraceContextPropagator

set_global_textmap(W3CTraceContextPropagator())
```

Backend **musi czytać** incoming `traceparent` header z requestu HTTP — wtedy span backendu staje się child spanu browsera i w Jaeger zobaczysz pełny end-to-end trace.

### Retry / timeout

```python
exporter = OTLPSpanExporter(
    endpoint="otel-collector:4317",
    insecure=True,                    # brak TLS w klastrze
    timeout=5,                        # max 5s — nie blokuj requestu
)
```

---

## Co instrumentować (minimum)

| Warstwa | Traces | Metrics |
|---------|--------|---------|
| **Browser** | `document-load`, `fetch`/`XHR`, `user-interaction` (opcj.) | — (opcjonalnie Web Vitals) |
| **Backend** | HTTP handler (incoming request), DB queries, external API calls | request count (counter), request duration (histogram), error count (counter), active connections (gauge) |

---

## Nazewnictwo — konwencje OpenTelemetry

### Spany

- Nazwa: `{HTTP_METHOD} {route}` → np. `POST /api/v1/translate`
- **NIE** pełny URL z query params (`POST /api/v1/translate?lang=pl&to=en` ❌)
- Atrybuty: `http.request.method`, `http.response.status_code`, `url.path`, `server.address`

### Metryki

- Counter: `_total` suffix → `http_requests_total`
- Histogram: `_seconds` suffix → `translation_duration_seconds`
- **Nie dodawaj** `_bucket`, `_count`, `_sum` — Prometheus doda automatycznie
- **Nie dodawaj** prefix `ivotrans_` — OTel Collector doda automatycznie

---

## Weryfikacja po wdrożeniu

### Checklist

1. **Jaeger** (`jaeger-ivotrans-dev.eltrue`) → szukaj po `service = ivotrans-frontend` i `service = ivotrans-backend`
2. **Trace correlation** → ten sam `traceID` w spanie browsera i backendu (parent-child relacja)
3. **Prometheus** → query z prefixem `ivotrans_*` (bez prefixu = brak wyników)
4. **OTel scrape endpoint** → `otel-collector:8889/metrics` — tu widzisz surowe metryki zanim Prometheus je zbierze
5. **Dashboardy Grafana** — już skonfigurowane z poprawnymi nazwami `ivotrans_*`:
   - "ivotrans - Application Metrics & Health" (HTTP, latency, connections)
   - "ivotrans - Jaeger Traces & Services" (span throughput, trace search)
   - "ivotrans - Observability Overview" (przegląd)
   - "OpenTelemetry Collector" (pipeline health)
   - "Prometheus 2.0 Overview" (scrape targets)

### Szybki smoke test (curl)

```bash
# Wyślij testowy trace
curl -X POST "https://ivotrans-dev.eltrue/api/telemetry/v1/traces" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TWÓJ_KLUCZ_API" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"smoke-test"}}]},"scopeSpans":[{"spans":[{"traceId":"'"$(openssl rand -hex 16)"'","spanId":"'"$(openssl rand -hex 8)"'","name":"test-span","kind":1,"startTimeUnixNano":"'"$(date +%s)000000000"'","endTimeUnixNano":"'"$(date +%s)500000000"'","status":{"code":1}}]}]}]}'
```

Odpowiedź `{"partialSuccess":{}}` = sukces.

---

## Podsumowanie zmian w infrastrukturze (do zrobienia)

| Co | Gdzie | Po co |
|----|-------|-------|
| Dodaj `X-API-Key` do `cors-allow-headers` | Ingress `ivotrans-main` annotacja | CORS nie zablokuje nagłówka |
| Dodaj walidację `X-API-Key` | Ingress `configuration-snippet` lub OTel Collector `bearertokenauth` | Autoryzacja requestów z browsera |
| Utwórz Secret z API key | `dev/secret.yaml` | Nie hardcoduj klucza |
| Opcjonalnie: dodaj localhost origin do CORS | Ingress + OTel Collector ConfigMap | Development z `localhost` |
