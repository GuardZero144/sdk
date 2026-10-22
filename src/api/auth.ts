import type { HttpClient } from './http';
import type { LoginRequest, LoginResponse } from './types';

export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  /** Exchanges a signed wallet message for a JWT and stores it on the client. */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const res = await this.http.post<LoginResponse>('auth/login', request);
    this.http.setToken(res.access_token);
    return res;
  }

  verify(token: string): Promise<{ walletAddress: string }> {
    return this.http.post('auth/verify', { token });
  }

  async refresh(walletAddress: string): Promise<{ access_token: string }> {
    const res = await this.http.post<{ access_token: string }>('auth/refresh', { walletAddress });
    this.http.setToken(res.access_token);
    return res;
  }

  logout(): void {
    this.http.setToken(undefined);
  }
}
