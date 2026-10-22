import type { HttpClient } from './http';
import type { CreateIdentityRequest, Entity, ListIdentitiesQuery, UpdateIdentityRequest } from './types';

export class IdentitiesApi {
  constructor(private readonly http: HttpClient) {}

  create(request: CreateIdentityRequest): Promise<Entity> {
    return this.http.post('identities', request);
  }

  list(query?: ListIdentitiesQuery): Promise<unknown> {
    return this.http.get('identities', { ...query });
  }

  get(id: string): Promise<Entity> {
    return this.http.get(`identities/${encodeURIComponent(id)}`);
  }

  update(id: string, request: UpdateIdentityRequest): Promise<Entity> {
    return this.http.patch(`identities/${encodeURIComponent(id)}`, request);
  }

  revoke(id: string, body?: Record<string, unknown>): Promise<Entity> {
    return this.http.patch(`identities/${encodeURIComponent(id)}/revoke`, body);
  }

  bulkRevoke(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post('identities/bulk-revoke', body);
  }

  revocations(): Promise<unknown> {
    return this.http.get('identities/revocations');
  }

  revocationStatus(id: string): Promise<unknown> {
    return this.http.get(`identities/${encodeURIComponent(id)}/revocation-status`);
  }

  fraudDetection(id: string): Promise<unknown> {
    return this.http.get(`identities/${encodeURIComponent(id)}/fraud-detection`);
  }

  verifyIntegrity(id: string): Promise<unknown> {
    return this.http.get(`identities/${encodeURIComponent(id)}/verify-integrity`);
  }

  delete(id: string): Promise<unknown> {
    return this.http.delete(`identities/${encodeURIComponent(id)}`);
  }
}
