import {
  type ContractLogDecodingData,
  type DecodeLogParams,
  type DecodedLog,
  type Log,
  decodeLogMultipleAbis,
} from './logDecoder.ts';

type LogHashId = string;

export class DecodedLogsCache {
  public readonly logDecodingCache: Map<LogHashId, DecodedLog> = new Map();

  async add(log: Log, decodedLog: DecodedLog | undefined) {
    if (!decodedLog) return;
    const logId = await this.createId(log);
    this.logDecodingCache.set(logId, decodedLog);
  }

  async get(log: Log) {
    return this.logDecodingCache.get(await this.createId(log));
  }

  async createId(log: Log) {
    const msgBuffer = new TextEncoder().encode(JSON.stringify(log));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Buffer.from(hashBuffer).toString('hex');
  }
}

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
