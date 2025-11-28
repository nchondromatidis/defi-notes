import { type Abi, AbiEventSignatureNotFoundError, decodeEventLog, toEventSignature } from 'viem';
import { trySync } from '../../common/utils.ts';
import type { AbiEvent } from 'tevm';
import type { RawLog } from '../types/artifact.ts';
import { DecodedDataCache } from './DecodedDataCache.ts';

// types
export type ContractLogDecodingData = {
  contractFQN: string | undefined;
  abi: Abi | undefined;
  contractAddress: string;
  contractRole: 'DELEGATECALL' | 'IMPLEMENTATION' | 'NORMAL';
};

export type DecodeLogParams<T extends ContractLogDecodingData | Array<ContractLogDecodingData>> = Readonly<{
  decodeData: T;
  log: RawLog;
}>;

export type DecodedLog = {
  contractFQN: string;
  decodedEventName?: string;
  decodedArgs?: unknown;
  decodedEventSignature?: string;
};

// with tx cache for logs that bubble up the stack
export class DecodedLogsCache extends DecodedDataCache<RawLog, DecodedLog> {}

export async function decodeLogMultipleAbisWithCache(
  params: DecodeLogParams<Array<ContractLogDecodingData>>,
  decodedLogsCache: DecodedLogsCache
): Promise<DecodedLog | undefined> {
  const { log } = params;

  let decodedLog = await decodedLogsCache.get(log);
  if (decodedLog) return decodedLog;
  decodedLog = decodeLogMultipleAbis(params);
  if (decodedLog) await decodedLogsCache.add(log, decodedLog);
  return decodedLog;
}

// decode log using multiple abis
export function decodeLogMultipleAbis(params: DecodeLogParams<Array<ContractLogDecodingData>>): DecodedLog | undefined {
  const { log } = params;
  for (const contractAndAbi of params.decodeData) {
    const decodedLog = decodeLogOneAbi({ decodeData: contractAndAbi, log });
    if (decodedLog) return decodedLog;
  }
  return undefined;
}

// decode log using one abi
export function decodeLogOneAbi(params: DecodeLogParams<ContractLogDecodingData>): DecodedLog | undefined {
  const {
    decodeData: { contractFQN, abi },
    log,
  } = params;

  if (!contractFQN || !abi) return undefined;

  const topics = log[1];
  const [signature, ...nonSignatureTopics] = topics;

  const decodedLogResult = trySync(() =>
    decodeEventLog({
      abi: abi,
      topics: [signature, ...nonSignatureTopics],
      data: log[2],
    })
  );

  const result: DecodedLog = {
    contractFQN,
  };

  if (decodedLogResult.ok) {
    let eventSignature: string | undefined = undefined;
    const decodedLog = decodedLogResult.value;
    if (decodedLog.eventName) {
      result.decodedEventName = decodedLog.eventName;
      const abiEvent = findEventByName(abi, decodedLog.eventName);
      eventSignature = abiEvent ? toEventSignature(abiEvent) : undefined;
    }
    result.decodedArgs = decodedLog.args;
    result.decodedEventSignature = eventSignature;
  }
  if (!decodedLogResult.ok && !(decodedLogResult.error instanceof AbiEventSignatureNotFoundError)) {
    throw decodedLogResult.error;
  }

  return result;
}

function findEventByName(abi: Abi, name: string): AbiEvent {
  const ev = abi.find((i): i is AbiEvent => i.type === 'event' && i.name === name);
  if (!ev) throw new Error('Event not found');
  return ev;
}
