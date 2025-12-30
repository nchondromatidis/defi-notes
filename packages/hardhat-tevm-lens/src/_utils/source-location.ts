import type { SrcDecoder } from 'solidity-ast/utils';
import { hardhatConvertFromSourceInputToContractFQN } from './hardhat';
import type { Debugger } from 'debug';

export function getSrcLocation(location: string, decodeSrc: SrcDecoder, debug: Debugger) {
  const [start, length, fileIndex] = location.split(':').map(Number);
  const endSrc = `${start + length}:0:${fileIndex}`;
  try {
    const start = decodeSrc({ src: location });
    const end = decodeSrc({ src: endSrc });

    const source1 = start.split(':')[0];
    const source2 = end.split(':')[0];
    if (source1 != source2) throw new Error(`Source does not match: ${start}, ${end}`);

    const source = hardhatConvertFromSourceInputToContractFQN(source1);

    const lineStart = Number(start.split(':')[1]);
    const lineEnd = Number(end.split(':')[1]);

    return { lineStart, lineEnd, source };
  } catch (e: unknown) {
    debug(`Location not found: ${location}: ${e}`);
    return undefined;
  }
}
