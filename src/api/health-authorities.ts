import type { HttpClient } from './http';
import type { Entity } from './types';

export class HealthAuthoritiesApi {
  constructor(private readonly http: HttpClient) {}

  connect(body: Record<string, unknown>): Promise<Entity> {
    return this.http.post('health-authorities/connect', body);
  }

  list(): Promise<Entity[]> {
    return this.http.get('health-authorities');
  }

  active(): Promise<Entity[]> {
    return this.http.get('health-authorities/active');
  }

  get(id: string): Promise<Entity> {
    return this.http.get(`health-authorities/${encodeURIComponent(id)}`);
  }

  update(id: string, body: Record<string, unknown>): Promise<Entity> {
    return this.http.put(`health-authorities/${encodeURIComponent(id)}`, body);
  }

  verify(id: string): Promise<unknown> {
    return this.http.post(`health-authorities/${encodeURIComponent(id)}/verify`);
  }

  disconnect(id: string): Promise<unknown> {
    return this.http.delete(`health-authorities/${encodeURIComponent(id)}/disconnect`);
  }

  reconnect(id: string): Promise<unknown> {
    return this.http.post(`health-authorities/${encodeURIComponent(id)}/reconnect`);
  }

  requestCredential(body: Record<string, unknown>): Promise<Entity> {
    return this.http.post('health-authorities/credentials/request', body);
  }

  getCredential(id: string): Promise<Entity> {
    return this.http.get(`health-authorities/credentials/${encodeURIComponent(id)}`);
  }

  credentialsByWallet(walletAddress: string): Promise<Entity[]> {
    return this.http.get(`health-authorities/credentials/wallet/${encodeURIComponent(walletAddress)}`);
  }

  credentialsByAuthority(authorityId: string): Promise<Entity[]> {
    return this.http.get(`health-authorities/credentials/authority/${encodeURIComponent(authorityId)}`);
  }

  retryCredential(id: string): Promise<unknown> {
    return this.http.post(`health-authorities/credentials/${encodeURIComponent(id)}/retry`);
  }

  revokeCredential(id: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.http.patch(`health-authorities/credentials/${encodeURIComponent(id)}/revoke`, body);
  }
}
