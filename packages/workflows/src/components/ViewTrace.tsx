import React from 'react';
import { Terminal, Info } from 'lucide-react';

import { Card } from './ui/card';
import { Button } from './ui/button';

interface ViewTraceProps {
  onStartTrace?: () => void;
}

export const ViewTrace: React.FC<Readonly<ViewTraceProps>> = ({ onStartTrace }) => {
  return (
    <Card className="not-content w-full overflow-hidden gap-0 rounded-none py-0 shadow-xl">
      <div className="flex flex-row">
        <div className="w-1/2 p-4 flex flex-col justify-between border-r border-border/30">
          <div className="flex flex-col gap-0.5 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono tracking-[0.2em] uppercase opacity-60">
              <Terminal className="size-2" />
              EVM LENS
            </div>
            <h1 className="text-base font-sans font-extrabold tracking-tight text-foreground leading-tight inline-flex items-center gap-2">
              Function Tracer
              <Info className="size-3.5 align-middle opacity-40 hover:opacity-100 cursor-help" />
            </h1>
          </div>
          <Button
            onClick={onStartTrace}
            className="mt-3 w-full tracking-[0.12em] font-extrabold shadow-md shadow-primary/5"
          >
            View Trace
          </Button>
        </div>

        <div className="w-1/2 flex flex-col divide-y divide-border/30 bg-background">
          <div className="flex-1 flex flex-col justify-center px-4 py-3">
            <span className="text-[7px] font-mono text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1">
              Source Tx
            </span>
            <div className="flex">
              <span className="font-mono text-primary/80 text-[8px] bg-primary/5 px-1.5 py-0.5 border border-primary/20 rounded-sm">
                0x71c...a4f2
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-4 py-3">
            <span className="text-[7px] font-mono text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1">
              Workflow
            </span>
            <span className="text-[9px] font-bold text-chart-2 tracking-tight uppercase">Mint Token Sequence</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-1.5 flex items-center justify-between border-t border-border/30">
        <div className="flex items-center gap-3">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
            NETWORK STATUS: ONLINE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-[0.15em]">BROWSER VM</span>
        </div>
      </div>
    </Card>
  );
};
