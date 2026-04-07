import { createClient } from 'viem';
import { createTevmTransport, tevmReady, type TevmTransport } from '@tevm/memory-client';
import {
  type Account,
  testActions,
  publicActions,
  type Client,
  type PublicActions,
  type TestActions,
  type Transport,
  type Chain,
} from 'viem';
import { localhost } from 'viem/chains';

export type PublicTestClient<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
  TAccount extends Account = Account,
> = Client<TTransport, TChain, TAccount, undefined, PublicActions & TestActions>;

export async function buildClient(defaultAccount: Account): Promise<PublicTestClient<TevmTransport>> {
  const tevmTransport = createTevmTransport({
    miningConfig: { type: 'auto' },
  });
  const client = createClient({
    account: defaultAccount,
    chain: localhost,
    transport: tevmTransport,
  })
    .extend(publicActions) // adds getBalance, getBlock, etc.
    .extend(testActions({ mode: 'anvil' })); // adds mine, setBalance, etc.;

  await tevmReady(client);

  return client;
}
