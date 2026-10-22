/**
 * Error codes returned by the ValidFi Soroban contracts.
 * Mirrors `contracts/src/errors.rs` in GuardZero144/ValidFi — keep in sync.
 */
export enum ContractErrorCode {
  IdentityNotFound = 1,
  VerificationNotFound = 2,
  PermissionNotFound = 3,
  SharedDocumentNotFound = 4,
  Unauthorized = 5,
  AlreadyInitialized = 6,
  UpgradeNotInitialized = 7,
  InvalidUpgradeHash = 8,
  MigrationAlreadyRun = 9,
  StateInconsistency = 10,
  UpgradeTimelockNotExpired = 11,
  ProxyNotInitialized = 12,
  InvalidImplementation = 13,
  MigrationFailed = 14,
  VersionMismatch = 15,
  StorageCorrupted = 16,
  SuspiciousActivity = 17,
  IssuerNotAuthorized = 18,
  CredentialRevoked = 19,
  CredentialNotFound = 20,
  PermissionDenied = 21,
  ShareExpired = 22,
  CannotReShare = 23,
}

/** Thrown when the backend API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown when a contract call fails in simulation or on-chain. */
export class ContractError extends Error {
  constructor(
    message: string,
    readonly code?: ContractErrorCode,
  ) {
    super(message);
    this.name = 'ContractError';
  }

  /** Extracts `Error(Contract, #N)` from a Soroban diagnostic message, if present. */
  static fromMessage(message: string): ContractError {
    const match = /Error\(Contract, #(\d+)\)/.exec(message);
    const code = match ? (Number(match[1]) as ContractErrorCode) : undefined;
    const label = code !== undefined && ContractErrorCode[code] ? `${ContractErrorCode[code]}: ` : '';
    return new ContractError(`${label}${message}`, code);
  }
}
