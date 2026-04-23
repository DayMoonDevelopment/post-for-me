import { applyDecorators, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import type { Type } from '@nestjs/common';

export function Paginated<T extends Type<any>>(
  model: T,
  opt?: { name?: string },
): MethodDecorator {
  const decorators = [
    Get(), // Assuming GET is standard for pagination
    ApiOkResponse({
      ...(opt?.name
        ? { description: `Paginated data set for ${opt.name}.` }
        : {}),
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            type: 'object',
            properties: {
              total: {
                type: 'number',
                description: 'Total number of items available.',
              },
              offset: {
                type: 'number',
                description: 'Number of items skipped.',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of items returned.',
              },
              next_cursor: {
                type: 'string',
                nullable: true,
                description:
                  'Cursor for the next page when keyset pagination is used.',
                example:
                  'eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0xN1QxMDowMDowMC4wMDBaIiwiaWQiOiJzcF8xMjMifQ',
              },
              next: {
                type: 'string',
                nullable: true,
                description:
                  'URL to the next page of results, or null if none. If a cursor was provided in the request, the next URL uses cursor pagination and ignores offset.',
                example:
                  'https://api.postforme.dev/v1/items?cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wNC0xN1QxMDowMDowMC4wMDBaIiwiaWQiOiJzcF8xMjMifQ&limit=10',
              },
            },
            required: ['total', 'offset', 'limit', 'next_cursor', 'next'],
          },
        },
        required: ['data', 'meta'],
      },
    }),
    ApiResponse({
      status: 500,
      description: `Internal server error when fetching ${
        opt?.name || 'paginated data'
      }.`,
    }),
  ];

  if (opt?.name) {
    decorators.push(
      ApiOperation({
        summary: `Get ${opt.name}`,
        description: `Get a paginated result for ${opt.name} based on the applied filters. Cursor pagination is preferred and takes precedence over offset when both are provided.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}
