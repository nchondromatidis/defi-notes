import React from 'react';
import { Terminal, Info } from 'lucide-react';

import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ViewTraceProps {
  workflowName: string;
  infoMessages?: string[];
  warnMessages?: string[];
  disabled?: boolean;
  onStartTrace?: () => void;
}

export const ViewTrace: React.FC<Readonly<ViewTraceProps>> = ({
  workflowName,
  infoMessages = [],
  warnMessages = [],
  disabled = false,
  onStartTrace,
}) => {
  return (
    <Card className="not-content w-full overflow-hidden gap-0 rounded-none py-0 shadow-xl">
      <div className="flex flex-row">
        <div className="w-1/2 p-4 flex flex-col justify-between border-r border-border/30">
          <div className="flex flex-col gap-0.5 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono tracking-[0.2em] uppercase opacity-60">
              <Terminal className="size-2" />
              EVM LENS
            </div>
            <h1 className="text-base font-sans font-extrabold tracking-tight text-foreground leading-tight inline-flex items-center gap-2">
              Function Trace
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    className={`size-3.5 align-middle opacity-40 hover:opacity-100 cursor-help ${warnMessages.length > 0 ? 'text-red-800' : ''}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="flex flex-col gap-1">
                    <span>- Ethereum VM running in the browser</span>
                    <span>- Protocol is deployed client side</span>
                    <span>- Transaction is decoded client side</span>
                    {infoMessages.map((message, index) => (
                      <span key={`info-${index}`}>{message}</span>
                    ))}
                    {warnMessages.map((message, index) => (
                      <span key={`warn-${index}`} className="text-red-700">
                        - {message}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </h1>
          </div>
          <Button
            onClick={onStartTrace}
            disabled={disabled}
            className="mt-3 w-full tracking-[0.12em] font-extrabold shadow-none"
          >
            View Trace
          </Button>
        </div>

        <div className="w-1/2 flex flex-col divide-y divide-border/30 bg-background">
          <div className="flex-1 flex flex-col justify-center px-4 py-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1">
              Workflow
            </span>
            <span className="text-xs font-bold text-chart-2 t">{workflowName}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center px-4 py-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1">
              Description
            </span>
            <span className="text-xs text-muted-foreground ">See the function trace and protocol source code</span>
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
