type JumpType = 'i' | 'o' | '-';
export type DecompressedSourceMap = { start: number; length: number; file: number; jump: JumpType; src: string };

export function decompressSourceMap(compressedSourceMap: string) {
  const map = compressedSourceMap.split(';');
  const ret = [];
  for (const k in map) {
    const compressed = map[k].split(':');
    const start = compressed[0] ? parseInt(compressed[0]) : ret[ret.length - 1].start;
    const length = compressed[1] ? parseInt(compressed[1]) : ret[ret.length - 1].length;
    const file = compressed[2] ? parseInt(compressed[2]) : ret[ret.length - 1].file;
    const jump = compressed[3] ? compressed[3] : ret[ret.length - 1].jump;
    const sourceMap: DecompressedSourceMap = {
      start,
      length,
      file,
      jump: jump as JumpType,
      src: `${start}:${length}:${file}`,
    };
    ret.push(sourceMap);
  }
  return ret;
}
