import type { ArtifactMap } from '@defi-notes/protocols/types';

export type Next = () => void;

export type ArtifactName = keyof ArtifactMap;
type ContractFQNPattern = `${string}.sol:${string}`;
export type ContractFQN = Extract<ArtifactName, ContractFQNPattern>;


export type Option<T> = T | undefined;
