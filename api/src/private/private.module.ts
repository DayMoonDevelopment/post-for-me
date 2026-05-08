import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { CmsModule } from './cms/cms.module';
import { StripeWebhookModule } from './webhooks/stripe/stripe.module';

/**
 * PrivateModule — aggregates internal, non-customer-facing sub-modules and
 * mounts them under the `/private/*` URL prefix. The whole module is omitted
 * from the public OpenAPI document by `SwaggerModule.createDocument`'s
 * `include` list in `main.ts`. Auth is per-route: Unkey RBAC for
 * service-to-service calls, Stripe signature verification for webhooks, etc.
 *
 * Add future private sub-modules by (a) importing them here and (b) adding
 * them as `children` on the `private` route below.
 */
@Module({
  imports: [
    CmsModule,
    StripeWebhookModule,
    RouterModule.register([
      {
        path: 'private',
        children: [
          { path: 'cms', module: CmsModule },
          {
            path: 'webhooks',
            children: [{ path: 'stripe', module: StripeWebhookModule }],
          },
        ],
      },
    ]),
  ],
})
export class PrivateModule {}
