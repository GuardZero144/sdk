import type { HttpClient } from './http';
import type { CreateVerificationRequest, Entity, UpdateVerificationRequest } from './types';

export class VerificationsApi {
  constructor(private readonly http: HttpClient) {}

  create(request: CreateVerificationRequest): Promise<Entity> {
    return this.http.post('verifications', request);
  }

  list(): Promise<Entity[]> {
    return this.http.get('verifications');
  }

  get(id: string): Promise<Entity> {
    return this.http.get(`verifications/${encodeURIComponent(id)}`);
  }

  update(id: string, request: UpdateVerificationRequest): Promise<Entity> {
    return this.http.patch(`verifications/${encodeURIComponent(id)}`, request);
  }

  approve(id: string): Promise<Entity> {
    return this.http.patch(`verifications/${encodeURIComponent(id)}/approve`);
  }

  reject(id: string, body?: Record<string, unknown>): Promise<Entity> {
    return this.http.patch(`verifications/${encodeURIComponent(id)}/reject`, body);
  }

  byIdentity(identityId: string): Promise<Entity[]> {
    return this.http.get(`verifications/identity/${encodeURIComponent(identityId)}`);
  }
}
