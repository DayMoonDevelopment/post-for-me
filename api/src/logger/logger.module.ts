import { Global, Module, Scope } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, INQUIRER } from '@nestjs/core';

import { AppLogger } from './app-logger';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') {
    return true;
  }
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') {
    return false;
  }
  return undefined;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AppLogger,
      scope: Scope.TRANSIENT,
      inject: [ConfigService, { token: INQUIRER, optional: true }],
      useFactory: (config: ConfigService, inquirer?: object) => {
        const configured = parseBoolean(
          config.get<string>('LOG_TO_CONSOLE') || 'false',
        );
        const logToConsole = configured ?? false;

        const context =
          inquirer &&
          (inquirer as { constructor?: { name?: string } }).constructor
            ? (inquirer as { constructor: { name: string } }).constructor.name
            : 'App';

        return new AppLogger(context, { logToConsole });
      },
    },
    HttpLoggingInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: HttpLoggingInterceptor,
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}
