import { describe, expect, it, vi } from 'vitest';
import { ApiError, ValidFiApi } from '../src';

function mockFetch(status: number, body: unknown) {
  return vi.fn(async (..._args: Parameters<typeof fetch>) => new Response(JSON.stringify(body), { status }));
}

describe('ValidFiApi', () => {
  it('stores the JWT from login and sends it on later requests', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'jwt-123', walletAddress: 'G...' })))
      .mockResolvedValueOnce(new Response(JSON.stringify([])));
    const api = new ValidFiApi({ baseUrl: 'http://localhost:3001/api/v1/', fetch });

    await api.auth.login({ walletAddress: 'G...', signature: 'sig', message: 'msg' });
    await api.verifications.list();

    const [url, init] = fetch.mock.calls[1]!;
    expect(String(url)).toBe('http://localhost:3001/api/v1/verifications');
    expect(init.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('serialises query params and skips undefined values', async () => {
    const fetch = mockFetch(200, { data: [] });
    const api = new ValidFiApi({ baseUrl: 'http://x/api/v1', fetch });

    await api.identities.list({ page: 2, limit: 10, verifiedOnly: undefined });

    expect(String(fetch.mock.calls[0]![0])).toBe('http://x/api/v1/identities?page=2&limit=10');
  });

  it('throws ApiError with the server message on failure', async () => {
    const api = new ValidFiApi({ baseUrl: 'http://x', fetch: mockFetch(401, { message: 'Wallet signature is invalid' }) });

    await expect(api.auth.login({ walletAddress: 'G', signature: 's', message: 'm' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Wallet signature is invalid',
    });
    expect(ApiError).toBeDefined();
  });
});
