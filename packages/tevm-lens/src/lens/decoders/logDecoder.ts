import { type Abi, AbiEventSignatureNotFoundError, bytesToHex, decodeEventLog, toEventSignature } from 'viem';
import { trySync } from '../../common/utils.ts';
import type { AbiEvent } from 'tevm';

// types
export type ContractLogDecodingData = {
  contractFQN: string | undefined;
  abi: Abi | undefined;
  contractAddress: string;
  contractRole: 'DELEGATECALL' | 'IMPLEMENTATION' | 'NORMAL';
};
export type Log = [address: Uint8Array, topics: Uint8Array[], data: Uint8Array];

export type DecodeLogParams<T extends ContractLogDecodingData | Array<ContractLogDecodingData>> = Readonly<{
  decodeData: T;
  log: Log;
}>;

export type DecodeLogReturn = {
  rawData: Log;
  contractFQN: string;
  decodedEventName?: string;
  decodedArgs?: unknown;
  decodedEventSignature?: string;
};

// decode log using multiple abis
export function decodeLogMultipleAbis(
  params: DecodeLogParams<Array<ContractLogDecodingData>>
): DecodeLogReturn | undefined {
  const { log } = params;
  for (const contractAndAbi of params.decodeData) {
    const decodeResult = decodeLogOneAbi({ decodeData: contractAndAbi, log });
    if (decodeResult) return decodeResult;
  }
  return undefined;
}

// decode log using one abi
export function decodeLogOneAbi(params: DecodeLogParams<ContractLogDecodingData>): DecodeLogReturn | undefined {
  const {
    decodeData: { contractFQN, abi },
    log,
  } = params;

  if (!contractFQN || !abi) return undefined;

  const topics = log[1].map((it) => bytesToHex(it));
  const [signature, ...nonSignatureTopics] = topics;

  const decodedLogResult = trySync(() =>
    decodeEventLog({
      abi: abi,
      topics: [signature, ...nonSignatureTopics],
      data: bytesToHex(log[2]),
    })
  );

  const result: DecodeLogReturn = {
    rawData: log,
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
