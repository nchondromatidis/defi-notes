import { test, beforeEach, describe } from 'vitest';
import { UniswapV2Workflows } from '../src/protocols/workflows/UniswapV2Workflows.ts';
import { HardhatEvmLensFileRL } from '@protocol-lens/evm-lens/test/_setup/HardhatEvmLensFileRL.ts';
import path from 'node:path';
import { inspect, printFunctionHierarchy } from '@protocol-lens/evm-lens/test/_setup/utils/inspect.ts';

export const PROTOCOLS_RESOURCES_PATH = path.join(__dirname, '..', '..', '..', 'packages', 'protocols');

describe('uniswap-v2', () => {
  let uniswapV2Actions: UniswapV2Workflows;

  beforeEach(async () => {
    const resourceLoader = new HardhatEvmLensFileRL(PROTOCOLS_RESOURCES_PATH, 'contracts');
    uniswapV2Actions = await UniswapV2Workflows.create(resourceLoader);
  });

  test('initialLiquidity', async () => {
    const a = await uniswapV2Actions.initialLiquidity({});
    inspect(a);
  });

  test('addLiquidity', async () => {
    const a = await uniswapV2Actions.addLiquidity();
    inspect(a);
  });

  test('swap', async () => {
    const a = await uniswapV2Actions.swap();
    printFunctionHierarchy(a.trace);
  });

  test('removeLiquidity', async () => {
    const a = await uniswapV2Actions.removeLiquidity();
    printFunctionHierarchy(a.trace);
  });
});
