import * as Sentry from '@sentry/nestjs';

// Must be imported before any other module so Sentry can instrument them.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production' && !!process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  // Baked into the image by the Docker build (commit SHA); empty on local builds.
  release: process.env.SENTRY_RELEASE || undefined,
  // Explicit (already the SDK default): never attach request headers,
  // cookies, or IPs — this API carries Unkey keys and Stripe data.
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
