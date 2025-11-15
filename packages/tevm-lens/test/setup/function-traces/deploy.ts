import type { LensClient } from '../../../src/lens/LensClient.js';
import type { IResourceLoader } from '../../../src/adapters/IResourceLoader.js';
import type { FunctionTracesArtifactsMap } from './types.js';
import { getContract } from 'viem';
import type { ProtocolName } from '../artifacts/index.js';

export async function deployFunctionTracesContracts(
  lensClient: LensClient<FunctionTracesArtifactsMap>,
  resourceLoader: IResourceLoader<FunctionTracesArtifactsMap, ProtocolName>
) {
  // deploy
  const calleeDeployResult = await lensClient.deploy('contracts/function-traces/CalleeContract.sol:CalleeContract', []);

  const externalLibDeployResult = await lensClient.deploy('contracts/function-traces/ExternalLib.sol:ExternalLib', []);
  const callerDeployResult = await lensClient.deploy(
    'contracts/function-traces/CallerContract.sol:CallerContract',
    [calleeDeployResult.createdAddress!],
    [
      {
        libFQN: 'contracts/function-traces/ExternalLib.sol:ExternalLib',
        address: externalLibDeployResult.createdAddress!,
      },
    ]
  );

  // abis
  const callerContractAbi = await resourceLoader.getArtifactPart(
    'contracts/function-traces/CallerContract.sol:CallerContract',
    'abi'
  );

  const calleeContractAbi = await resourceLoader.getArtifactPart(
    'contracts/function-traces/CalleeContract.sol:CalleeContract',
    'abi'
  );

  // contracts
  const callerContract = getContract({
    address: callerDeployResult.createdAddress!,
    abi: callerContractAbi,
    client: lensClient.client,
  });

  const calleeContract = getContract({
    address: callerDeployResult.createdAddress!,
    abi: calleeContractAbi,
    client: lensClient.client,
  });

  return {
    callerContract,
    calleeContract,
  };
}
