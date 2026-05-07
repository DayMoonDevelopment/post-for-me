import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type Database from './types/Database';

/**
 * Provides a Kysely instance backed by a `pg` connection pool. Used by areas
 * that need a typed query builder against the postgres database directly
 * (e.g. the `stripe` schema, which lives outside Supabase's PostgREST
 * exposure). Other areas of the codebase still use Supabase via
 * `SupabaseService` — this service is additive, not a replacement.
 */
@Injectable()
export class KyselyService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KyselyService.name);
  private pool!: Pool;
  db!: Kysely<Database>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }

    this.pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      // Hard cap on any single statement — webhook handlers and the
      // excess-use report don't run anything that should take longer.
      // Without this, a runaway query can pin a connection until pg's
      // default (none) kicks in.
      statement_timeout: 10_000,
    });
    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`shutting down kysely (signal=${signal ?? 'none'})`);
    await this.db?.destroy();
  }
}
