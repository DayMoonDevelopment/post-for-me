export interface PaginationCursor {
  created_at: string;
  id: string;
}

export function encodePaginationCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodePaginationCursor(
  cursor: string | undefined,
): PaginationCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<PaginationCursor>;

    if (
      !decoded ||
      typeof decoded.created_at !== 'string' ||
      typeof decoded.id !== 'string'
    ) {
      return null;
    }

    return {
      created_at: decoded.created_at,
      id: decoded.id,
    };
  } catch {
    return null;
  }
}
