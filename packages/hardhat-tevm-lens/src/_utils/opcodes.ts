const pushOpcodes = [
  'PUSH1',
  'PUSH2',
  'PUSH3',
  'PUSH4',
  'PUSH5',
  'PUSH6',
  'PUSH7',
  'PUSH8',
  'PUSH9',
  'PUSH10',
  'PUSH11',
  'PUSH12',
  'PUSH13',
  'PUSH14',
  'PUSH15',
  'PUSH16',
  'PUSH17',
  'PUSH18',
  'PUSH19',
  'PUSH20',
  'PUSH21',
  'PUSH22',
  'PUSH23',
  'PUSH24',
  'PUSH25',
  'PUSH26',
  'PUSH27',
  'PUSH28',
  'PUSH29',
  'PUSH30',
  'PUSH31',
  'PUSH32',
];

export function isPushOpcode(opcodeName: string): boolean {
  return pushOpcodes.includes(opcodeName);
}

export function getPushSizeOrZero(opcodeName: string): number {
  if (isPushOpcode(opcodeName)) {
    const sizeStr = opcodeName.substring(4); // Skip "PUSH"
    return parseInt(sizeStr, 10);
  }
  return 0;
}

const externalCallOpcodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];

export function isExternalCallOpcode(opcodeName: string): boolean {
  return externalCallOpcodes.includes(opcodeName);
}
