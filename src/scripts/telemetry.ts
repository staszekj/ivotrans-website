import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Konfiguracja - wykryj środowisko
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isDev = window.location.hostname.includes('dev.eltrue') || window.location.hostname.includes('ivotrans-dev');

// Endpoint telemetrii
const OTEL_ENDPOINT = isLocalhost 
  ? null // wyłącz na localhost (brak CORS)
  : 'https://ivotrans-dev.eltrue/api/telemetry/v1/traces';

const API_KEY = '7924dbcdd1a71d03cd92a724033d782e99b431a565d1a9f9ca178d6548ce0266';

// Jeśli localhost - tylko loguj do konsoli
if (!OTEL_ENDPOINT) {
  console.log('[Telemetry] Running on localhost - telemetry disabled (no CORS)');
} else {
  // Resource z informacjami o serwisie
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'ivotrans-website',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': isDev ? 'development' : 'production',
  });

  // Exporter OTLP HTTP
  const exporter = new OTLPTraceExporter({
    url: OTEL_ENDPOINT,
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  // Provider
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  // Rejestracja providera z context managerem
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  // Instrumentacje automatyczne
  registerInstrumentations({
    instrumentations: [
      // Automatyczne śledzenie ładowania strony
      new DocumentLoadInstrumentation(),
      // Automatyczne śledzenie interakcji użytkownika (kliknięcia)
      new UserInteractionInstrumentation({
        eventNames: ['click', 'submit'],
      }),
    ],
  });

  console.log('[Telemetry] OpenTelemetry initialized, sending to:', OTEL_ENDPOINT);
}

// Eksportuj tracer do ręcznego użycia
import { trace } from '@opentelemetry/api';
export const tracer = trace.getTracer('ivotrans-website', '1.0.0');

// Helper do śledzenia nawigacji
export function trackPageView(pageName: string, attributes?: Record<string, string>) {
  const span = tracer.startSpan('page_view');
  span.setAttributes({
    'page.name': pageName,
    'page.url': window.location.href,
    'page.path': window.location.pathname,
    'page.referrer': document.referrer || 'direct',
    ...attributes,
  });
  span.end();
}

// Helper do śledzenia eventów
export function trackEvent(eventName: string, attributes?: Record<string, string>) {
  const span = tracer.startSpan(eventName);
  span.setAttributes({
    'event.name': eventName,
    'page.url': window.location.href,
    ...attributes,
  });
  span.end();
}
