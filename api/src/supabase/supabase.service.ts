import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

import { Database } from '../../supabase';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private supabaseUrl: string | undefined;
  private supabaseAnonKey: string | undefined;
  private supabaseJWTSecret: string | undefined;
  private supabaseServiceKey: string | undefined;

  supabaseClient: SupabaseClient<Database>;

  supabaseServiceRole: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    this.supabaseJWTSecret = this.configService.get<string>(
      'SUPABASE_JWT_SECRET',
    );
    this.supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_KEY',
    );

    if (
      !this.supabaseUrl ||
      !this.supabaseAnonKey ||
      !this.supabaseJWTSecret ||
      !this.supabaseServiceKey
    ) {
      throw new Error('Missing Supabase Configuration');
    }

    // Initialize with anonymous client by default
    this.supabaseClient = createClient<Database>(
      this.supabaseUrl,
      this.supabaseAnonKey,
    );

    this.supabaseServiceRole = createClient<Database>(
      this.supabaseUrl,
      this.supabaseServiceKey,
    );
  }

  // Set the current user ID for this service instance
  setUser(userId: string): void {
    const token = this.createJWT(userId);

    if (!token || !this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Failed to create user client');
    }

    this.supabaseClient = createClient<Database>(
      this.supabaseUrl,
      this.supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
        },
      },
    );
  }

  // Helper method to create a JWT with user claims
  private createJWT(userId: string): string {
    if (!this.supabaseJWTSecret) {
      throw new Error('JWT secret not configured');
    }

    return jwt.sign(
      {
        sub: userId,
        role: 'authenticated',
        aud: 'authenticated',
      },
      this.supabaseJWTSecret,
      {
        expiresIn: '1h',
      },
    );
  }
}
