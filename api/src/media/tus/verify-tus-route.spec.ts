import { verifyTusRoute } from './verify-tus-route';

describe('verifyTusRoute', () => {
  let fetchMock: jest.Mock;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does not log when the route resolves and is correctly guarded (401)', async () => {
    fetchMock.mockResolvedValue({ status: 401 });

    await verifyTusRoute(3000);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/v1/media/tus',
      { method: 'HEAD' },
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs an error when the route does not resolve (404)', async () => {
    fetchMock.mockResolvedValue({ status: 404 });

    await verifyTusRoute(3000);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain(
      'does not resolve to the TUS controller',
    );
  });

  it('logs an error instead of throwing when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));

    await expect(verifyTusRoute(3000)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('Failed to verify TUS route');
  });
});
