type DataHashId = string;

export class DecodedDataCache<RawDataT, DecodedDataT> {
  public readonly logDecodingCache: Map<DataHashId, DecodedDataT> = new Map();

  async add(rawData: RawDataT, decodedLog: DecodedDataT | undefined) {
    if (!decodedLog) return;
    const logId = await this.createId(rawData);
    this.logDecodingCache.set(logId, decodedLog);
  }

  async get(rawData: RawDataT) {
    return this.logDecodingCache.get(await this.createId(rawData));
  }

  async createId(rawData: RawDataT) {
    // NOTE: JSON.stringify must produce the same string from rawData
    const msgBuffer = new TextEncoder().encode(JSON.stringify(rawData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
