import type { HttpClient, Query } from './http';

export class CredentialsApi {
  constructor(private readonly http: HttpClient) {}

  search(query: Query): Promise<unknown> {
    return this.http.get('credentials/search', query);
  }

  status(id: string): Promise<unknown> {
    return this.http.get(`credentials/status/${encodeURIComponent(id)}`);
  }

  revoke(id: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`credentials/status/${encodeURIComponent(id)}/revoke`, body);
  }

  verify(id: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`credentials/status/${encodeURIComponent(id)}/verify`, body);
  }

  connections(): Promise<unknown> {
    return this.http.get('credentials/connections');
  }

  delete(id: string): Promise<unknown> {
    return this.http.delete(`credentials/${encodeURIComponent(id)}`);
  }

  verifyDeletion(id: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`credentials/${encodeURIComponent(id)}/verify-deletion`, body);
  }
}
