import { TraceViewerClient } from '@defi-notes/evm-lens-ui/components/TraceViewerClient';
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { X, Info } from 'lucide-react';
import {
  getProtocolWorkflowsRegistry,
  type ProtocolWorkflowsRegistry,
  runWorkflow,
  type MethodArgs,
  type WorkflowNames,
} from '../protocols/run-workflow.ts';
import type { TraceResult } from '@defi-notes/evm-lens-ui/types/TraceResult';

const getResourcesBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('ProtocolWorkflowTrace must run in browser environment');
  }
  return `${window.location.origin}/defi-notes`;
};

type ProtocolActionProps<
  R extends Record<string, object> = ProtocolWorkflowsRegistry,
  P extends keyof R = keyof R,
  M extends WorkflowNames<R[P]> = WorkflowNames<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
> = {
  protocol: P;
  workflow: M;
  args?: A;
  header: string;
  infoMessages?: string[];
  warnMessages?: string[];
};

export const ProtocolWorkflowTrace: React.FC<ProtocolActionProps<ProtocolWorkflowsRegistry>> = ({
  protocol,
  workflow,
  args = undefined,
  header,
  infoMessages = [],
  warnMessages = [],
}) => {
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        setLoading(true);
        setError(null);
        const registry = await getProtocolWorkflowsRegistry(getResourcesBaseUrl(), 'contracts');
        const { trace } = await runWorkflow(registry, protocol, workflow, args);
        const result = await registry[protocol].toTraceResult(trace);
        setTraceResult(result ?? null);
      } catch (err) {
        console.error('[ProtocolWorkflowTrace] Error:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch trace'));
      } finally {
        setLoading(false);
      }
    };

    fetchTrace();
  }, [protocol, workflow, args]);

  const renderContent = () => {
    if (loading) {
      return <div>Loading workflow...</div>;
    }

    if (error) {
      return <div style={{ color: 'red', padding: '20px' }}>Error: {error.message}</div>;
    }

    if (!traceResult) {
      return <div>No trace result available</div>;
    }

    return <TraceViewerClient trace={traceResult} />;
  };

  return (
    <>
      <Card className="w-full gap-2 py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-base font-semibold">{header}</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info
                className={`size-4 cursor-pointer ${warnMessages.length > 0 ? 'text-red-800' : 'text-muted-foreground'}`}
              />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="flex flex-col gap-1">
                <span>ethereumjs running in the browser</span>
                <span>protocol is deployed client side</span>
                <span>transaction is decoded client side</span>
                {infoMessages.map((message, index) => (
                  <span key={`info-${index}`}>{message}</span>
                ))}
                {warnMessages.map((message, index) => (
                  <span key={`warn-${index}`} className="text-red-700">
                    {message}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="pt-0 pb-1 text-sm text-muted-foreground">
          See the function trace and protocol source code
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsOpen(true)}
            disabled={!traceResult || loading || !!error}
          >
            View Trace
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none rounded-none max-w-[95vw] sm:max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 gap-0"
          ref={dialogRef}
          onPointerDownOutside={(e) => {
            // Only prevent close if the pointer-down target is
            // actually inside the dialog's DOM node
            if (dialogRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
            // If truly outside, do nothing → dialog closes normally
          }}
        >
          <DialogTitle className="sr-only">Trace Viewer - {header}</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          {traceResult && renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};
