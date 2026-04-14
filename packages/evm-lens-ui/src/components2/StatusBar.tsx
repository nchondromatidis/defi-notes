import React from 'react';

type StatusBarProps = Readonly<{
  networkStatus?: string;
  vmLabel?: string;
  solcVersion?: string;
}>;

export const StatusBar: React.FC<StatusBarProps> = ({
  networkStatus = 'ONLINE',
  vmLabel = 'BROWSER VM',
  solcVersion = '0.8.20',
}) => {
  return (
    <footer className="h-6 bg-zinc-950 border-t border-zinc-800 flex items-center px-3 justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="label-font text-[9px] font-bold text-zinc-400">NETWORK STATUS: {networkStatus}</span>
        </div>
        <div className="h-3 w-px bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="label-font text-[9px] font-bold text-zinc-400 uppercase">{vmLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[9px] font-bold text-zinc-500">
        <span>SOLC: {solcVersion}</span>
      </div>
    </footer>
  );
};
