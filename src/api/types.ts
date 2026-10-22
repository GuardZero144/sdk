// Request/response shapes for the ValidFi backend (backend/src/**/dto in GuardZero144/ValidFi).

export type Metadata = Record<string, unknown>;

export interface LoginRequest {
  walletAddress: string;
  /** Base64 or hex signature of `message`, produced by the user's Stellar wallet. */
  signature: string;
  message: string;
}

export interface LoginResponse {
  access_token: string;
  walletAddress: string;
}

export interface CreateIdentityRequest {
  walletAddress: string;
  documentHash: string;
  ipfsCid: string;
  verificationStatus?: boolean;
  metadata?: Metadata;
}

export type UpdateIdentityRequest = Partial<CreateIdentityRequest>;

export interface ListIdentitiesQuery {
  page?: number;
  limit?: number;
  verifiedOnly?: boolean;
}

export interface CreateVerificationRequest {
  identityId: string;
  walletAddress: string;
  proofHash: string;
  verificationCommitment: string;
  metadata?: Metadata;
}

export type UpdateVerificationRequest = Partial<CreateVerificationRequest>;

export interface CreateShareRequest {
  ownerAddress: string;
  recipientAddress: string;
  documentHash: string;
  encryptedKey: string;
  durationSeconds: number;
  metadata?: Metadata;
}

export type UpdateShareRequest = Partial<CreateShareRequest>;

/**
 * Entities returned by the API. Fields beyond `id` vary by endpoint and are
 * left open until the backend publishes an OpenAPI schema.
 */
export interface Entity {
  id: string;
  [key: string]: unknown;
}
