import {
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
  type xdr,
} from '@stellar/stellar-sdk';
import { ContractError } from '../errors';

/**
 * Signs a transaction envelope (base64 XDR) and returns the signed XDR.
 * With Freighter: `(xdr, passphrase) => signTransaction(xdr, { networkPassphrase: passphrase }).then(r => r.signedTxXdr)`.
 */
export type TransactionSigner = (txXdr: string, networkPassphrase: string) => Promise<string>;

export interface SorobanClientOptions {
  rpcUrl: string;
  networkPassphrase?: string;
  /** Allow plain-HTTP RPC URLs (local quickstart node). */
  allowHttp?: boolean;
  /** Fee in stroops for each transaction before resource fees. */
  fee?: string;
  /** Seconds before a submitted transaction times out. */
  timeoutSeconds?: number;
}

export interface InvokeOptions {
  /** Account that pays for and signs the transaction. */
  source: string;
  signer: TransactionSigner;
}

export const TESTNET: Required<Pick<SorobanClientOptions, 'rpcUrl' | 'networkPassphrase'>> = {
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: Networks.TESTNET,
};

/** Low-level helper for reading from and writing to any Soroban contract. */
export class SorobanClient {
  readonly server: rpc.Server;
  readonly networkPassphrase: string;
  private readonly fee: string;
  private readonly timeoutSeconds: number;

  constructor(options: SorobanClientOptions) {
    this.server = new rpc.Server(options.rpcUrl, { allowHttp: options.allowHttp ?? false });
    this.networkPassphrase = options.networkPassphrase ?? Networks.TESTNET;
    this.fee = options.fee ?? BASE_FEE;
    this.timeoutSeconds = options.timeoutSeconds ?? 30;
  }

  /**
   * Simulates a read-only call and returns the decoded result. Nothing is signed or submitted.
   * `source` must be an existing account; any funded account works for reads.
   */
  async read<T>(contractId: string, method: string, args: xdr.ScVal[], source: string): Promise<T> {
    const tx = await this.buildTx(contractId, method, args, source);
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw ContractError.fromMessage(sim.error);
    const retval = sim.result?.retval;
    return (retval ? scValToNative(retval) : undefined) as T;
  }

  /** Simulates, signs, submits and waits for a state-changing call. Returns the decoded result. */
  async invoke<T>(contractId: string, method: string, args: xdr.ScVal[], options: InvokeOptions): Promise<T> {
    const tx = await this.buildTx(contractId, method, args, options.source);

    let prepared;
    try {
      prepared = await this.server.prepareTransaction(tx);
    } catch (err) {
      throw ContractError.fromMessage(err instanceof Error ? err.message : String(err));
    }

    const signedXdr = await options.signer(prepared.toXDR(), this.networkPassphrase);
    const signed = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);

    const sent = await this.server.sendTransaction(signed);
    if (sent.status === 'ERROR') {
      throw new ContractError(`Transaction rejected: ${sent.errorResult?.toXDR('base64') ?? 'unknown error'}`);
    }

    const result = await this.waitFor(sent.hash);
    return (result.returnValue ? scValToNative(result.returnValue) : undefined) as T;
  }

  private async buildTx(contractId: string, method: string, args: xdr.ScVal[], source: string) {
    const account = await this.server.getAccount(source);
    return new TransactionBuilder(account, { fee: this.fee, networkPassphrase: this.networkPassphrase })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(this.timeoutSeconds)
      .build();
  }

  private async waitFor(hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
    const deadline = Date.now() + this.timeoutSeconds * 1000;
    while (Date.now() < deadline) {
      const res = await this.server.getTransaction(hash);
      if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return res;
      if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new ContractError(`Transaction ${hash} failed on-chain`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new ContractError(`Timed out waiting for transaction ${hash}`);
  }
}
