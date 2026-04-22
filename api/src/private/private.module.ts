import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { CmsModule } from './cms/cms.module';

/**
 * PrivateModule — aggregates internal, non-customer-facing sub-modules and
 * mounts them under the `/private/*` URL prefix. Every sub-module's
 * controllers must use `@ProtectPrivate()` to authenticate requests and to
 * stay out of the public OpenAPI document.
 *
 * Add future private sub-modules by (a) importing them here and (b) adding
 * them as `children` on the `private` route below.
 */
@Module({
  imports: [
    CmsModule,
    RouterModule.register([
      {
        path: 'private',
        children: [{ path: 'cms', module: CmsModule }],
      },
    ]),
  ],
})
export class PrivateModule {}
