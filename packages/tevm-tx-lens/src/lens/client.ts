import { createClient, createTevmTransport, tevmReady, type TevmTransport } from 'tevm';
import type { Account, Client } from 'viem';

export async function buildClient(nodeAccount: Account): Promise<Client<TevmTransport>> {
  const tevmTransport = createTevmTransport({
    miningConfig: { type: 'auto' },
  });
  const client = createClient({
    account: nodeAccount,
    transport: tevmTransport,
  });
  await tevmReady(client);

  return client;
}
