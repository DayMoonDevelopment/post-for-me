import { Global, Module } from '@nestjs/common';
import { Unkey } from '@unkey/api';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'UNKEY_INSTANCE',
      useFactory: (configService: ConfigService): Unkey => {
        const rootKey = configService.get<string>('UNKEY_ROOT_KEY');

        if (!rootKey) {
          throw new Error('UNKEY_ROOT_KEY is not defined');
        }

        const client = new Unkey({
          rootKey,
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['UNKEY_INSTANCE'],
})
export class UnkeyModule {}
