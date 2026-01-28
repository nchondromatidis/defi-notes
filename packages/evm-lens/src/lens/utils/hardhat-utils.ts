import { type Address, type Hex, keccak256, toHex } from 'viem';
import { InvalidArgument } from '../../_common/errors.ts';

export function hardhatLinkExternalLibToBytecode(bytecode: Hex, libraryFqn: string, libraryAddress: Address) {
  const hash = keccak256(toHex(hardhatToCompilerSourceInput(libraryFqn)));
  const tagContent = hash.slice(2, 2 + 34);
  const tag = `__$${tagContent}$__`;

  const libraryAddressNoPrefix = libraryAddress.toLowerCase().slice(2);
  if (!bytecode.includes(tag)) {
    throw new InvalidArgument(`Library tag not found in bytecode.`, { externalLibraryFqn: libraryFqn });
  }

  return bytecode.replaceAll(tag, libraryAddressNoPrefix) as Hex;
}

export function hardhatToCompilerSourceInput(contractFQN: string): string {
  return 'project/' + contractFQN;
}

export function hardhatUserSourceInput(contractSourceInput: string): string {
  return contractSourceInput?.replace('project/', '');
}

export function hardhatGetReferencesFQN(
  linkReferences: Record<string, Record<string, unknown>> | unknown
): Array<string> {
  if (!linkReferences) return [];
  return Object.entries(linkReferences).flatMap(([inputSource, contractObj]) =>
    Object.keys(contractObj).map((contract) => {
      return hardhatUserSourceInput(`${inputSource}:${contract}`);
    })
  );
}
