import { SorobanClient, TESTNET, ValidFiApi, VaccinationVerificationContract } from '../src';

// REST API: authenticate with a signed wallet message, then call protected endpoints.
const api = new ValidFiApi({ baseUrl: 'http://localhost:3001/api/v1' });

await api.auth.login({
  walletAddress: process.env.WALLET_ADDRESS!,
  signature: process.env.WALLET_SIGNATURE!,
  message: process.env.WALLET_MESSAGE!,
});
console.log(await api.verifications.list());

// Contracts: read credential status straight from Soroban.
const soroban = new SorobanClient(TESTNET);
const vaccination = new VaccinationVerificationContract(soroban, process.env.VACCINATION_CONTRACT_ID!);

console.log(await vaccination.checkVaccinationStatus(1, process.env.WALLET_ADDRESS!));
