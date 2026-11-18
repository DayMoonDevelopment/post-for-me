import { describe, expect, it, vi } from 'vitest';
import { redactSecrets } from './redact-secrets';
import { safeConsole } from './safe-console';

describe('credential-safe diagnostics', () => {
  it('sanitizes account credentials, HTTP config and errors without mutation', () => {
    const input = {
      account: {
        access_token: 'account-secret',
        refresh_token: 'refresh-secret',
      },
      error: Object.assign(new Error('Rejected account-secret'), {
        config: { headers: { Authorization: 'Bearer header-secret' } },
        response: { status: 401, data: { code: 190 } },
      }),
      url: 'https://example.com/?access_token=query-secret&fields=id',
    };
    const result = redactSecrets(input);
    const serialized = JSON.stringify(result);
    for (const secret of [
      'account-secret',
      'refresh-secret',
      'header-secret',
      'query-secret',
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(result.error.message).toBe('Rejected [REDACTED]');
    expect(result.error.response.status).toBe(401);
    expect(result.url).toContain('&fields=id');
    expect(input.account.access_token).toBe('account-secret');
  });

  it('sanitizes native headers and token response text', () => {
    const result = redactSecrets({
      headers: new Headers({
        Authorization: 'Bearer header-secret',
        'Access-Token': 'tiktok-secret',
      }),
      response: '{"access_token":"response-secret","code":190}',
      body: new URLSearchParams({ refresh_token: 'form-secret' }),
    });
    for (const secret of [
      'header-secret',
      'tiktok-secret',
      'response-secret',
      'form-secret',
    ]) {
      expect(JSON.stringify(result)).not.toContain(secret);
    }
  });

  it('redacts credentials across console arguments before logging', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      safeConsole.error('Rejected log-secret', { accessToken: 'log-secret' });
      expect(spy).toHaveBeenCalledWith('Rejected [REDACTED]', {
        accessToken: '[REDACTED]',
      });
    } finally {
      spy.mockRestore();
    }
  });
});
