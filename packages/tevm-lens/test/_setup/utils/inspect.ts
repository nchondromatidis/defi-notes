import util from 'node:util';

declare global {
  interface Uint8Array {
    [util.inspect.custom]: () => string;
  }
}

Uint8Array.prototype[util.inspect.custom] = function () {
  return `0x${Buffer.from(this).toString('hex')}`;
};

export function inspect(obj: unknown) {
  console.log(util.inspect(obj, { depth: 9, colors: true }));
}
