import { type Client, type Account } from 'viem';
import {
  createTevmTransport,
  tevmReady,
  createClient,
  type TevmTransport,
} from 'tevm';

export async function buildTevmClient(
  nodeAccount: Account
): Promise<Client<TevmTransport>> {
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
