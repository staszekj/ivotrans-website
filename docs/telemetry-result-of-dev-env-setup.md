# Telemetria dla ivotrans (Astro)

## Endpoint

```
https://ivotrans-dev.eltrue/api/telemetry/v1/traces
```

## Protokół

- **OTLP over HTTP** (OpenTelemetry Protocol)
- Content-Type: `application/json` lub `application/x-protobuf`

## Autentykacja

### Browser (frontend)

```
X-API-Key: 7924dbcdd1a71d03cd92a724033d782e99b431a565d1a9f9ca178d6548ce0266
```

### Backend (Node.js/SSR)

mTLS z certyfikatem `eltrue-client-tls` (Kubernetes secret).

Pliki lokalne:
- `~/.eltrue-secrets/eltrue-client.crt` - certyfikat klienta
- `~/.eltrue-secrets/eltrue-client.key` - klucz prywatny
- `~/.eltrue-secrets/eltrue-ca.crt` - CA do weryfikacji serwera

## Biblioteki JS

```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http
```

## GeoIP (backend-side)

Implementacja po stronie Astro SSR - wzbogacanie span'ów o lokalizację na podstawie IP klienta.

### Biblioteka

```bash
npm install maxmind
```

### MaxMind GeoLite2

| Parametr | Wartość |
|----------|---------|
| Account ID | `<see k8s secret maxmind-credentials>` |
| License Key | `<see k8s secret maxmind-credentials>` |
| Database | GeoLite2-City (darmowa, wymaga rejestracji) |

Download URL:
```
https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz
```

### Przykład użycia

```typescript
import maxmind, { CityResponse } from 'maxmind';

const lookup = await maxmind.open<CityResponse>('/path/to/GeoLite2-City.mmdb');

// W middleware Astro:
const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] 
  || request.headers.get('x-real-ip');
const geo = lookup.get(clientIP);

// Dodaj do span attributes:
span.setAttributes({
  'client.geo.country': geo?.country?.iso_code,
  'client.geo.city': geo?.city?.names?.en,
  'client.geo.latitude': geo?.location?.latitude,
  'client.geo.longitude': geo?.location?.longitude,
});
```

## Backends

| Dane | Backend | URL | Auth |
|------|---------|-----|------|
| Traces | Jaeger | `https://jaeger-ivotrans-dev.eltrue` | mTLS |
| Metrics | Prometheus | `https://prometheus-ivotrans-dev.eltrue` | mTLS |

## Dashboardy

- Grafana: `https://grafana-ivotrans-dev.eltrue` (mTLS)
