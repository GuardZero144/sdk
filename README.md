# @guardzero/sdk

The official TypeScript SDK for **[ValidFi](https://github.com/GuardZero144/ValidFi)**, GuardZero's privacy-preserving health credential platform on [Stellar Soroban](https://developers.stellar.org/docs/build/smart-contracts/overview).

[![CI](https://github.com/GuardZero144/sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/GuardZero144/sdk/actions/workflows/ci.yml)
![status](https://img.shields.io/badge/status-early%20preview-orange)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> **Status: early preview (v0.1.0).** The API surface mirrors the ValidFi `main` branch and may change between minor versions until 1.0.

---

## Table of contents

- [What is ValidFi?](#what-is-validfi)
- [What this SDK does](#what-this-sdk-does)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Part 1: Backend API client](#part-1-backend-api-client)
  - [Creating a client](#creating-a-client)
  - [Authentication](#authentication)
  - [Identities](#identities)
  - [Verifications](#verifications)
  - [Data sharing](#data-sharing)
  - [Health authorities](#health-authorities)
  - [Credentials](#credentials)
  - [Calling routes without a wrapper](#calling-routes-without-a-wrapper)
- [Part 2: Soroban contract clients](#part-2-soroban-contract-clients)
  - [How reads and writes work](#how-reads-and-writes-work)
  - [Creating a client](#creating-a-soroban-client)
  - [Signers](#signers)
  - [VaccinationVerification](#vaccinationverification)
  - [IdentityRegistry](#identityregistry)
  - [Calling any contract method](#calling-any-contract-method)
  - [Value encoding (`scval`)](#value-encoding-scval)
- [Error handling](#error-handling)
- [Types](#types)
- [Environments](#environments)
- [Coverage and roadmap](#coverage-and-roadmap)
- [Project structure](#project-structure)
- [Development](#development)
- [Keeping in sync with ValidFi](#keeping-in-sync-with-validfi)
- [Contributing](#contributing)
- [Related](#related)

---

## What is ValidFi?

ValidFi lets **health authorities** issue tamper-proof vaccination credentials, lets **holders** keep control of them, and lets **verifiers** (venues, employers, border agencies) check vaccination status without seeing names, birthdates or medical history.

It has four parts:

| Layer | Technology | Role |
| --- | --- | --- |
| Smart contracts | Rust, Soroban | Source of truth for identities, credentials, verifications, access grants and shares |
| Backend | NestJS, PostgreSQL, Redis | Wallet login, indexing, IPFS uploads, fraud checks, convenience queries |
| Storage | IPFS (Pinata) | Encrypted credential documents, referenced by CID |
| Zero-knowledge | Circom, SnarkJS, Groth16 | Proving facts about a credential without revealing it |

## What this SDK does

The SDK gives you one typed package for both ways of talking to ValidFi:

1. **`ValidFiApi`**: an HTTP client for the backend REST API. Use it for login, listing and searching, and any workflow the backend orchestrates.
2. **Contract clients** (`SorobanClient`, `VaccinationVerificationContract`, `IdentityRegistryContract`): talk to the Soroban contracts directly, with no backend in between. Use these when the on-chain state must be authoritative, or when the user's wallet must sign.

Both layers work in browsers and in Node.js 18 or later.

## Installation

The package is not on npm yet. Install it from GitHub:

```bash
npm install github:GuardZero144/sdk
# or
pnpm add github:GuardZero144/sdk
```

Once it is published:

```bash
npm install @guardzero/sdk
```

The only runtime dependency is [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk). The package ships ESM, CommonJS and TypeScript declarations.

## Quick start

```ts
import {
  ValidFiApi,
  SorobanClient,
  TESTNET,
  VaccinationVerificationContract,
} from '@guardzero/sdk';

// 1. Backend: log in with a wallet signature, then call protected routes.
const api = new ValidFiApi({ baseUrl: 'http://localhost:3001/api/v1' });
await api.auth.login({ walletAddress, signature, message });
const myShares = await api.dataSharing.byOwner(walletAddress);

// 2. Chain: read a credential's status directly from Soroban.
const soroban = new SorobanClient(TESTNET);
const vaccination = new VaccinationVerificationContract(soroban, VACCINATION_CONTRACT_ID);
const status = await vaccination.checkVaccinationStatus(1n, walletAddress); // 'Valid'
```

A runnable version is in [`examples/quickstart.ts`](examples/quickstart.ts).

---

## Part 1: Backend API client

### Creating a client

```ts
import { ValidFiApi } from '@guardzero/sdk';

const api = new ValidFiApi({
  baseUrl: 'https://api.example.com/api/v1', // include the API prefix
  token: savedJwt,                           // optional: reuse a stored session
  fetch: customFetch,                        // optional: defaults to globalThis.fetch
});
```

| Option | Type | Description |
| --- | --- | --- |
| `baseUrl` | `string` | Backend URL **including** the API prefix. The backend defaults to port `3001` and prefix `api/v1`. A trailing slash is fine. |
| `token` | `string?` | A JWT to send as `Authorization: Bearer …`. Usually set for you by `auth.login`. |
| `fetch` | `typeof fetch?` | Inject a fetch implementation for testing, retries, logging or older runtimes. |

`ValidFiApi` exposes one namespace per backend module, plus the underlying `http` client:

```ts
api.auth  api.identities  api.verifications  api.dataSharing
api.healthAuthorities  api.credentials  api.http
```

### Authentication

ValidFi has no passwords. A user proves they own a Stellar account by signing a message, and the backend returns a JWT.

**What the backend expects:**

- `walletAddress`: the Stellar public key (`G…`).
- `message`: any UTF-8 string. Include a nonce or timestamp so a signature can't be replayed.
- `signature`: a **base64-encoded ed25519 signature over the raw UTF-8 bytes of `message`**, made with that account's secret key.

```ts
const { access_token } = await api.auth.login({ walletAddress, signature, message });
// The token is now stored on `api` and sent on every following request.
```

**Producing the signature in Node (scripts, tests, server-side issuers):**

```ts
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET!);
const message = `ValidFi login ${new Date().toISOString()}`;
const signature = keypair.sign(Buffer.from(message, 'utf8')).toString('base64');

await api.auth.login({ walletAddress: keypair.publicKey(), signature, message });
```

**In the browser**, sign with the user's wallet (Freighter, Albedo, LOBSTR). Check that the wallet signs the raw message bytes. Some wallets add a prefix or hash the message first (for example SEP-53 message signing), and the current backend will reject those signatures.

| Method | HTTP | Description |
| --- | --- | --- |
| `auth.login({ walletAddress, signature, message })` | `POST /auth/login` | Verifies the signature, returns `{ access_token, walletAddress }`, and stores the token |
| `auth.verify(token)` | `POST /auth/verify` | Returns the token payload `{ walletAddress }`, or throws `401` |
| `auth.refresh(walletAddress)` | `POST /auth/refresh` | Issues a new token and stores it |
| `auth.logout()` | none | Clears the stored token locally |

To persist a session across page loads, save `access_token` yourself and pass it back as `token` when you create the client. You can also set it later with `api.http.setToken(token)`.

### Identities

An identity links a wallet to an identity document: its hash, and the IPFS CID of the encrypted file. All routes require a JWT.

| Method | HTTP |
| --- | --- |
| `identities.create({ walletAddress, documentHash, ipfsCid, verificationStatus?, metadata? })` | `POST /identities` |
| `identities.list({ page?, limit?, verifiedOnly? })` | `GET /identities` |
| `identities.get(id)` | `GET /identities/:id` |
| `identities.update(id, partial)` | `PATCH /identities/:id` |
| `identities.revoke(id, body?)` | `PATCH /identities/:id/revoke` |
| `identities.bulkRevoke(body)` | `POST /identities/bulk-revoke` |
| `identities.revocations()` | `GET /identities/revocations` |
| `identities.revocationStatus(id)` | `GET /identities/:id/revocation-status` |
| `identities.fraudDetection(id)` | `GET /identities/:id/fraud-detection` |
| `identities.verifyIntegrity(id)` | `GET /identities/:id/verify-integrity` |
| `identities.delete(id)` | `DELETE /identities/:id` |

```ts
const identity = await api.identities.create({
  walletAddress,
  documentHash: '9f86d081884c7d65…', // hash of the encrypted document
  ipfsCid: 'bafybeigdyrzt5…',
  metadata: { documentType: 'passport' },
});

const page = await api.identities.list({ page: 1, limit: 20, verifiedOnly: true });
```

### Verifications

A verification is a ZK proof submission about an identity, which a reviewer then approves or rejects. All routes require a JWT.

| Method | HTTP |
| --- | --- |
| `verifications.create({ identityId, walletAddress, proofHash, verificationCommitment, metadata? })` | `POST /verifications` |
| `verifications.list()` | `GET /verifications` |
| `verifications.get(id)` | `GET /verifications/:id` |
| `verifications.update(id, partial)` | `PATCH /verifications/:id` |
| `verifications.approve(id)` | `PATCH /verifications/:id/approve` |
| `verifications.reject(id, body?)` | `PATCH /verifications/:id/reject` |
| `verifications.byIdentity(identityId)` | `GET /verifications/identity/:identityId` |

```ts
const v = await api.verifications.create({
  identityId: identity.id,
  walletAddress,
  proofHash,               // hash of the Groth16 proof
  verificationCommitment,  // public commitment the proof is checked against
});
await api.verifications.approve(v.id);
```

### Data sharing

Time-limited sharing of an encrypted document with another wallet. The owner encrypts the document key for the recipient (`encryptedKey`), and the share expires after `durationSeconds`. All routes require a JWT.

| Method | HTTP |
| --- | --- |
| `dataSharing.create({ ownerAddress, recipientAddress, documentHash, encryptedKey, durationSeconds, metadata? })` | `POST /data-sharing` |
| `dataSharing.list()` | `GET /data-sharing` |
| `dataSharing.get(id)` | `GET /data-sharing/:id` |
| `dataSharing.update(id, partial)` | `PATCH /data-sharing/:id` |
| `dataSharing.revoke(id)` | `PATCH /data-sharing/:id/revoke` |
| `dataSharing.extend(id, body)` | `PATCH /data-sharing/:id/extend` |
| `dataSharing.isActive(id)` | `GET /data-sharing/:id/active` |
| `dataSharing.byOwner(address)` | `GET /data-sharing/owner/:ownerAddress` |
| `dataSharing.byRecipient(address)` | `GET /data-sharing/recipient/:recipientAddress` |

```ts
const share = await api.dataSharing.create({
  ownerAddress: walletAddress,
  recipientAddress: venueAddress,
  documentHash,
  encryptedKey,             // document key encrypted to the recipient
  durationSeconds: 60 * 60, // one hour
});
```

### Health authorities

Registration of credential issuers, and the credential requests made to them.

| Method | HTTP |
| --- | --- |
| `healthAuthorities.connect(body)` | `POST /health-authorities/connect` |
| `healthAuthorities.list()` / `.active()` | `GET /health-authorities`, `/active` |
| `healthAuthorities.get(id)` / `.update(id, body)` | `GET` / `PUT /health-authorities/:id` |
| `healthAuthorities.verify(id)` | `POST /health-authorities/:id/verify` |
| `healthAuthorities.disconnect(id)` / `.reconnect(id)` | `DELETE /:id/disconnect`, `POST /:id/reconnect` |
| `healthAuthorities.requestCredential(body)` | `POST /health-authorities/credentials/request` |
| `healthAuthorities.getCredential(id)` | `GET /health-authorities/credentials/:id` |
| `healthAuthorities.credentialsByWallet(address)` | `GET /health-authorities/credentials/wallet/:walletAddress` |
| `healthAuthorities.credentialsByAuthority(id)` | `GET /health-authorities/credentials/authority/:authorityId` |
| `healthAuthorities.retryCredential(id)` | `POST /health-authorities/credentials/:id/retry` |
| `healthAuthorities.revokeCredential(id, body?)` | `PATCH /health-authorities/credentials/:id/revoke` |

### Credentials

Status, search and secure deletion of issued credentials.

| Method | HTTP |
| --- | --- |
| `credentials.search(query)` | `GET /credentials/search` |
| `credentials.status(id)` | `GET /credentials/status/:id` |
| `credentials.revoke(id, body?)` | `POST /credentials/status/:id/revoke` |
| `credentials.verify(id, body?)` | `POST /credentials/status/:id/verify` |
| `credentials.connections()` | `GET /credentials/connections` |
| `credentials.delete(id)` | `DELETE /credentials/:id` |
| `credentials.verifyDeletion(id, body?)` | `POST /credentials/:id/verify-deletion` |

### Calling routes without a wrapper

Some backend modules don't have a namespace yet. `api.http` gives you the same base URL, auth header and error handling for any route:

```ts
const report = await api.http.get('analytics/summary', { from: '2026-01-01' });
await api.http.post('access-control/grant', { grantee, resourceId });
```

`get(path, query?)`, `post(path, body?)`, `put(path, body?)`, `patch(path, body?)` and `delete(path)` are all generic: `api.http.get<MyType>(…)`.

---

## Part 2: Soroban contract clients

### How reads and writes work

| | Read | Write |
| --- | --- | --- |
| Method | `client.read(...)` | `client.invoke(...)` |
| Signature needed | No | Yes, from the `source` account |
| Fee | None | Yes, paid by `source` |
| What happens | The transaction is **simulated** and the result decoded | Simulate, add resource fees, **sign**, submit, then poll until success or failure |
| Typical use | Status checks, lookups | Issuing, verifying and revoking credentials, registering identities |

Reads still need a `source` account that **exists on the network**, because Soroban simulation needs one. Any funded account works, and it is never charged.

### Creating a Soroban client

```ts
import { SorobanClient, TESTNET } from '@guardzero/sdk';
import { Networks } from '@stellar/stellar-sdk';

const testnet = new SorobanClient(TESTNET);

const local = new SorobanClient({
  rpcUrl: 'http://localhost:8000/soroban/rpc',
  networkPassphrase: Networks.STANDALONE,
  allowHttp: true,
});
```

| Option | Default | Description |
| --- | --- | --- |
| `rpcUrl` | required | Soroban RPC endpoint |
| `networkPassphrase` | `Networks.TESTNET` | Network to build and sign for |
| `allowHttp` | `false` | Allow `http://` RPC URLs, for a local quickstart node |
| `fee` | `BASE_FEE` (100 stroops) | Base fee per transaction. Resource fees are added during simulation. |
| `timeoutSeconds` | `30` | Transaction validity window, and how long `invoke` waits for confirmation |

`TESTNET` is `{ rpcUrl: 'https://soroban-testnet.stellar.org', networkPassphrase: Networks.TESTNET }`.

### Signers

The SDK never handles secret keys itself. Writes take a **signer**: a function that receives the prepared transaction as base64 XDR and returns the signed XDR.

```ts
type TransactionSigner = (txXdr: string, networkPassphrase: string) => Promise<string>;
```

**Freighter (browser):**

```ts
import { signTransaction } from '@stellar/freighter-api';

const signer = async (xdr: string, networkPassphrase: string) =>
  (await signTransaction(xdr, { networkPassphrase })).signedTxXdr;
```

**Keypair (Node: scripts, tests, issuer back-office):**

```ts
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

const issuerKey = Keypair.fromSecret(process.env.ISSUER_SECRET!);

const signer = async (xdr: string, networkPassphrase: string) => {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  tx.sign(issuerKey);
  return tx.toXDR();
};
```

Pass it with the paying account:

```ts
const opts = { source: issuerKey.publicKey(), signer };
```

### VaccinationVerification

```ts
import { VaccinationVerificationContract } from '@guardzero/sdk';

const vaccination = new VaccinationVerificationContract(soroban, VACCINATION_CONTRACT_ID);
```

| Method | Kind | Signed by | Returns |
| --- | --- | --- | --- |
| `submitCredential(params, opts)` | write | `params.issuer` | `bigint` credential id |
| `verifyCredential(credentialId, verifier, opts)` | write | `verifier` (must be whitelisted) | `boolean` |
| `revokeCredential(credentialId, issuer, reason, opts)` | write | `issuer` | `void` |
| `checkVaccinationStatus(credentialId, source)` | read | none | `'Pending' \| 'Valid' \| 'Expired' \| 'Revoked' \| 'Invalid'` |
| `isFullyVaccinated(patientId, source)` | read | none | `boolean` |
| `getCredential(credentialId, source)` | read | none | credential record |
| `getCredentialByPatient(patientId, source)` | read | none | `bigint` credential id |

**Issuing a credential (health authority):**

```ts
const credentialId = await vaccination.submitCredential(
  {
    issuer: issuerKey.publicKey(),
    patientId: 42n,
    vaccineType: 'MMR',
    doseNumber: 1,
    totalDoses: 2,
    lotNumber: 'L-2026-001',
    administeredAt: 1767225600n,  // unix seconds
    expiryDate: 1893456000n,      // unix seconds
    proofHash: '9f86d081…',       // 32 bytes as hex, or a Uint8Array
    zkProof: 'a3f1c2…',           // 32 bytes
  },
  { source: issuerKey.publicKey(), signer },
);
```

**Verifying and checking (verifier):**

```ts
await vaccination.verifyCredential(credentialId, verifierAddress, { source: verifierAddress, signer });

if ((await vaccination.checkVaccinationStatus(credentialId, verifierAddress)) === 'Valid') {
  // admit
}
```

Numeric ids accept `number` or `bigint`. Use `bigint` for values that may go above `Number.MAX_SAFE_INTEGER`. Contract `u64` results are always returned as `bigint`.

### IdentityRegistry

```ts
import { IdentityRegistryContract } from '@guardzero/sdk';

const registry = new IdentityRegistryContract(soroban, IDENTITY_REGISTRY_CONTRACT_ID);
```

| Method | Kind | Returns |
| --- | --- | --- |
| `registerIdentity(owner, documentHash, ipfsCid, opts)` | write (owner signs) | `bigint` identity id |
| `revokeIdentity(identityId, opts)` | write | `void` |
| `getIdentity(identityId, source)` | read | identity record |
| `isVerified(identityId, source)` | read | `boolean` |
| `getVersion(source)` | read | `number`: the contract version, which changes on upgrade |

### Calling any contract method

The `Verification`, `AccessControl`, `DataSharing` and `Auditing` contracts don't have typed wrappers yet, and neither do the rest of the `IdentityRegistry` methods. Call them through `SorobanClient` with arguments encoded by `scval`:

```ts
import { scval } from '@guardzero/sdk';

// Read
const valid = await soroban.read<boolean>(
  VERIFICATION_CONTRACT_ID, 'is_verification_valid', [scval.u64(7)], walletAddress,
);

// Write
await soroban.invoke(
  DATA_SHARING_CONTRACT_ID, 'extend_share', [scval.u64(shareId), scval.u64(3600)],
  { source: walletAddress, signer },
);
```

Method names and argument order must match the Rust signature exactly. Results are decoded with `scValToNative`.

### Value encoding (`scval`)

| Helper | Rust type | Accepts |
| --- | --- | --- |
| `scval.address(s)` | `Address` | `G…` account or `C…` contract string |
| `scval.u32(n)` | `u32` | `number` |
| `scval.u64(n)` | `u64` | `number \| bigint` |
| `scval.string(s)` | `String` | `string` |
| `scval.bytesN32(v)` | `BytesN<32>` | 64-character hex (with or without `0x`) or a 32-byte `Uint8Array`. Any other length throws. |

For other types (`Vec`, `Map`, structs, enums), use `nativeToScVal` from `@stellar/stellar-sdk` directly.

---

## Error handling

The SDK throws two error classes, both exported:

### `ApiError` (backend)

Thrown for any non-2xx HTTP response.

| Property | Description |
| --- | --- |
| `status` | HTTP status code |
| `message` | The backend's `message` field, or a generated `"<METHOD> <path> failed with <status>"` |
| `body` | The parsed response body, for validation details |

```ts
import { ApiError } from '@guardzero/sdk';

try {
  await api.auth.login(creds);
} catch (err) {
  if (err instanceof ApiError && err.status === 401) {
    // bad signature or expired token
  }
}
```

### `ContractError` (Soroban)

Thrown when simulation fails, the network rejects the transaction, the transaction fails on-chain, or confirmation times out. If Soroban reports a contract error (`Error(Contract, #N)`), `code` is set and the message is prefixed with the error name.

```ts
import { ContractError, ContractErrorCode } from '@guardzero/sdk';

try {
  await vaccination.verifyCredential(id, verifier, opts);
} catch (err) {
  if (err instanceof ContractError && err.code === ContractErrorCode.CredentialRevoked) {
    // show "this credential has been revoked"
  }
}
```

| Code | Name | Code | Name |
| --- | --- | --- | --- |
| 1 | `IdentityNotFound` | 13 | `InvalidImplementation` |
| 2 | `VerificationNotFound` | 14 | `MigrationFailed` |
| 3 | `PermissionNotFound` | 15 | `VersionMismatch` |
| 4 | `SharedDocumentNotFound` | 16 | `StorageCorrupted` |
| 5 | `Unauthorized` | 17 | `SuspiciousActivity` |
| 6 | `AlreadyInitialized` | 18 | `IssuerNotAuthorized` |
| 7 | `UpgradeNotInitialized` | 19 | `CredentialRevoked` |
| 8 | `InvalidUpgradeHash` | 20 | `CredentialNotFound` |
| 9 | `MigrationAlreadyRun` | 21 | `PermissionDenied` |
| 10 | `StateInconsistency` | 22 | `ShareExpired` |
| 11 | `UpgradeTimelockNotExpired` | 23 | `CannotReShare` |
| 12 | `ProxyNotInitialized` | | |

Errors from your signer, such as the user rejecting a wallet prompt, are passed through unchanged.

## Types

All request types are exported for use in your own code:

```ts
import type {
  LoginRequest, LoginResponse,
  CreateIdentityRequest, UpdateIdentityRequest, ListIdentitiesQuery,
  CreateVerificationRequest, UpdateVerificationRequest,
  CreateShareRequest, UpdateShareRequest,
  SubmitCredentialParams, VaccinationStatus,
  SorobanClientOptions, InvokeOptions, TransactionSigner,
  Entity,
} from '@guardzero/sdk';
```

Request types match the backend DTOs exactly. Responses are typed as `Entity` (`{ id: string; [key: string]: unknown }`) or `unknown` until the backend publishes an OpenAPI schema. Narrow them with your own interfaces:

```ts
interface Identity { id: string; walletAddress: string; verificationStatus: boolean }
const identity = (await api.identities.get(id)) as Identity;
```

## Environments

| Runtime | Supported | Notes |
| --- | --- | --- |
| Modern browsers | ✅ | Uses the native `fetch` |
| Node.js ≥ 18 | ✅ | Native `fetch`. Older versions need a `fetch` option. |
| Next.js (app or pages router) | ✅ | Use the contract clients in client components when signing with a browser wallet |
| Deno, Bun | Should work | Not tested in CI |

Typical configuration:

| Setting | Local | Testnet |
| --- | --- | --- |
| Backend `baseUrl` | `http://localhost:3001/api/v1` | your deployed backend |
| Soroban RPC | `http://localhost:8000/soroban/rpc` (`allowHttp: true`) | `https://soroban-testnet.stellar.org` |
| Passphrase | `Networks.STANDALONE` | `Networks.TESTNET` |
| Contract IDs | from `stellar contract deploy` | `IDENTITY_REGISTRY_CONTRACT_ID` etc. in the backend `.env` |

## Coverage and roadmap

| Area | Status |
| --- | --- |
| REST: `auth`, `identities`, `verifications`, `data-sharing`, `health-authorities`, `credentials` | ✅ Wrapped |
| REST: `access-control`, `permissions`, `audit`, `analytics`, `backup`, `indexer`, `credential-export`, `credential-versioning`, `credential-sharing-history`, `health` | ⏳ Use `api.http` |
| Contract: `VaccinationVerification` | ✅ Core methods (`authorize_verifier` pending) |
| Contract: `IdentityRegistry` | ✅ Core methods (update, mark-verified and upgrade admin pending) |
| Contract: `Verification`, `AccessControl`, `DataSharing`, `Auditing` | ⏳ Use `SorobanClient` |
| Typed response models (from OpenAPI) | ⏳ |
| ZK helpers: Groth16 proof generation and verification via SnarkJS | ⏳ |
| Wallet-message signing helpers | ⏳ |
| npm release | ⏳ |

## Project structure

```
src/
├── index.ts                 # public exports
├── errors.ts                # ApiError, ContractError, ContractErrorCode
├── api/
│   ├── index.ts             # ValidFiApi: wires up the namespaces
│   ├── http.ts              # HttpClient: base URL, JWT header, JSON, errors
│   ├── types.ts             # request/response types (mirror backend DTOs)
│   ├── auth.ts  identities.ts  verifications.ts
│   ├── data-sharing.ts  health-authorities.ts  credentials.ts
└── contracts/
    ├── index.ts
    ├── client.ts            # SorobanClient: read (simulate) / invoke (sign + submit + poll)
    ├── scval.ts             # argument encoders
    ├── vaccination-verification.ts
    └── identity-registry.ts
test/                        # vitest unit tests (no network)
examples/quickstart.ts
```

## Development

```bash
git clone https://github.com/GuardZero144/sdk.git
cd sdk
npm install

npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup → dist/ (ESM, CJS, .d.ts)
```

CI runs typecheck, test and build on every push and pull request.

**Adding a REST namespace:** create `src/api/<module>.ts` following the existing pattern (a class that takes `HttpClient`), add its DTOs to `types.ts`, register it in `ValidFiApi`, and add a test.

**Adding a contract wrapper:** create `src/contracts/<contract>.ts`, encode each argument with `scval` in the same order as the Rust signature, use `client.read` for view functions and `client.invoke` for functions that call `require_auth`, then export it from `contracts/index.ts`.

## Keeping in sync with ValidFi

This SDK mirrors code in [ValidFi](https://github.com/GuardZero144/ValidFi). When ValidFi changes, update the matching file here:

| ValidFi source | SDK file |
| --- | --- |
| `backend/src/**/*.controller.ts` (routes) | `src/api/<module>.ts` |
| `backend/src/**/dto/*.ts` | `src/api/types.ts` |
| `backend/src/auth/auth.service.ts` (signature format) | `src/api/auth.ts`, this README |
| `contracts/src/<contract>.rs` (function signatures) | `src/contracts/<contract>.ts` |
| `contracts/src/errors.rs` | `src/errors.ts` |

## Contributing

1. Find or open an issue in this repo. Comment to ask for it to be assigned to you before starting.
2. Fork, branch from `main`, and keep each PR to one issue (`Closes #N`).
3. Add or update tests, and make sure `npm run typecheck && npm test && npm run build` passes.
4. Update this README if you change the public API.

## Related

- **[ValidFi](https://github.com/GuardZero144/ValidFi)**: contracts, backend, frontend and ZK circuits
- **[Docs](https://guardzero144.github.io/docs/)** ([source](https://github.com/GuardZero144/docs)): developer documentation
- [Stellar JS SDK](https://github.com/stellar/js-stellar-sdk) · [Soroban docs](https://developers.stellar.org/docs/build/smart-contracts/overview) · [Freighter API](https://docs.freighter.app/)
