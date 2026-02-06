# GeoIP Processor dla OTel Collector - Requirements

## Cel

Wzbogacenie span'ów o dane geograficzne na podstawie IP klienta.

## Środowisko

- Namespace: `ivotrans-dev`
- OTel Collector: `otel-collector` (już wdrożony)

## MaxMind GeoLite2

| Parametr | Wartość |
|----------|---------|
| Account ID | `<see secret maxmind-credentials>` |
| License Key | `<see secret maxmind-credentials>` |
| Edition | GeoLite2-City |

Download URL:
```
https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz
```

## Wymagania

### 1. GeoIP Database

Opcja A (preferowana): InitContainer pobierający bazę
```yaml
initContainers:
  - name: download-geoip
    image: curlimages/curl:latest
    command:
      - sh
      - -c
      - |
        curl -sSL "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz" \
          | tar -xzf - --strip-components=1 -C /geoip
    env:
      - name: MAXMIND_LICENSE_KEY
        valueFrom:
          secretKeyRef:
            name: maxmind-credentials
            key: license-key
    volumeMounts:
      - name: geoip-data
        mountPath: /geoip
```

Opcja B: PersistentVolume z CronJob do aktualizacji

### 2. Secret dla MaxMind

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: maxmind-credentials
  namespace: ivotrans-dev
type: Opaque
stringData:
  account-id: "<your-account-id>"
  license-key: "<your-license-key>"
```

### 3. OTel Collector Config

Dodaj processor `geoip` do pipeline:

```yaml
processors:
  geoip:
    context: span
    providers:
      maxmind:
        database_path: /geoip/GeoLite2-City.mmdb
```

Uwaga: OTel Collector musi używać obrazu z geoip processor lub opentelemetry-collector-contrib.

### 4. Przekazywanie IP klienta

Nginx Ingress musi przekazywać rzeczywiste IP klienta. Sprawdź czy są ustawione:

```yaml
# W ConfigMap nginx-ingress
use-forwarded-headers: "true"
compute-full-forwarded-for: "true"
```

Telemetry endpoint powinien ustawiać atrybut `net.sock.peer.addr` lub `client.address` z nagłówka `X-Forwarded-For`.

### 5. Pipeline config

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [geoip, batch]
      exporters: [otlp/jaeger]
```

## Oczekiwane atrybuty span

Po wzbogaceniu span powinien zawierać:

| Atrybut | Przykład |
|---------|----------|
| `geo.country.name` | "Poland" |
| `geo.country.iso_code` | "PL" |
| `geo.city.name` | "Warsaw" |
| `geo.location.lat` | 52.2297 |
| `geo.location.lon` | 21.0122 |
| `geo.continent.name` | "Europe" |

## Weryfikacja

1. Wyślij trace z przeglądarki
2. Sprawdź w Jaeger czy span ma atrybuty `geo.*`

## Uwagi

- GeoLite2 wymaga aktualizacji co najmniej raz w miesiącu
- Rozważ CronJob do automatycznej aktualizacji bazy
- Collector-contrib image: `otel/opentelemetry-collector-contrib:latest`
