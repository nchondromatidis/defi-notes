export type CallSiteIndex = {
  callSitePc: number;
  jumpDestPc: number;
  callSiteLineStart: number;
  callSiteLineEnd: number;
  source: string;
  contractFQN: string;
};

export type CallSiteIndexes = Array<CallSiteIndex>;
