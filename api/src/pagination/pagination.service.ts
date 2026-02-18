import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  PaginationMeta,
  PaginatedResponse,
} from './pagination-response.interface';
import type { PaginatedRequestQuery } from './pagination-request.interface';
import { BasePaginatedQueryDto } from './base-paginated-query.dto';

@Injectable({ scope: Scope.REQUEST })
export class PaginationService {
  constructor(@Inject(REQUEST) private request: Request) {}

  /**
   * Generates the 'next' URL for pagination based on current request and metadata.
   * @param meta - Pagination metadata { total, offset, limit }.
   * @param currentQuery - The original query parameters object from the request.
   * @returns The full URL string for the next page, or null if there is no next page.
   */
  generateNextUrl(
    meta: Pick<PaginationMeta, 'total' | 'offset' | 'limit'>,
    currentQuery: Record<string, any>,
  ): string | null {
    const hasMore = meta.offset + meta.limit < meta.total;

    if (!hasMore) {
      return null;
    }

    const nextOffset = meta.offset + meta.limit;
    const url = new URL(
      `${this.request.protocol}://${this.request.get('host')}${this.request.path}`,
    );

    for (const key in currentQuery) {
      if (
        Object.prototype.hasOwnProperty.call(currentQuery, key) &&
        key !== 'offset' &&
        key !== 'limit' &&
        currentQuery[key] !== undefined
      ) {
        url.searchParams.set(key, String(currentQuery[key]));
      }
    }

    url.searchParams.set('limit', String(meta.limit));
    url.searchParams.set('offset', String(nextOffset));

    return url.toString();
  }

  /**
   * Creates a paginated response from pre-transformed data and count.
   * @param requestQuery - A promise resolving to the transformed data and count.
   * @param queryParams - The query parameters for pagination metadata.
   * @returns A PaginatedResponse with data and metadata.
   */
  async createResponse<T>(
    requestQuery: PaginatedRequestQuery<T>,
    queryParams: BasePaginatedQueryDto,
  ): Promise<PaginatedResponse<T>> {
    const { data, count } = await requestQuery;

    const total = count;
    const offset = queryParams.offset;
    const limit = queryParams.limit; // Default limit

    const nextUrl = this.generateNextUrl({ total, offset, limit }, queryParams);

    const meta: PaginationMeta = {
      total,
      offset,
      limit,
      next: nextUrl,
    };

    return {
      data,
      meta,
    };
  }
}
