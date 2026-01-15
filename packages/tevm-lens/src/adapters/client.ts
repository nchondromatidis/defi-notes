import { createTevmTransport, tevmReady, type TevmTransport } from 'tevm';
import { type Account, createTestClient, type TestClient } from 'viem';

export async function buildClient(nodeAccount: Account): Promise<TestClient<'anvil', TevmTransport>> {
  const tevmTransport = createTevmTransport({
    miningConfig: { type: 'auto' },
  });
  const client = createTestClient({
    account: nodeAccount,
    transport: tevmTransport,
    mode: 'anvil',
  });
  await tevmReady(client);

  return client;
}
