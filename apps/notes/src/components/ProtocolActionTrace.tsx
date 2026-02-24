import { TraceViewerClient } from '@defi-notes/evm-lens-ui';
import React, { useEffect, useRef, useState } from 'react';
import type { TraceResult } from '@defi-notes/evm-lens-ui';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { type MethodArgs } from '@/utils/run-method.ts';
import {
  protocolActionsRegistry,
  type ProtocolActionsRegistry,
  runWorkflow,
  type ProtocolActionsMethodKeys,
} from '@/protocols/protocol-actions-registry.ts';

type ProtocolActionProps<
  R extends Record<string, object> = ProtocolActionsRegistry,
  P extends keyof R = keyof R,
  M extends ProtocolActionsMethodKeys<R[P]> = ProtocolActionsMethodKeys<R[P]>,
  A extends MethodArgs<R[P], M> = MethodArgs<R[P], M>,
> = {
  protocol: P;
  workflow: M;
  args: A;
  header: string;
};

export const ProtocolActionTrace: React.FC<ProtocolActionProps<ProtocolActionsRegistry>> = ({
  protocol,
  workflow,
  args,
  header,
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
        const trace = await runWorkflow(protocolActionsRegistry, protocol, workflow, args);
        const result = await protocolActionsRegistry[protocol].toTraceResult(trace);
        setTraceResult(result ?? null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch trace'));
      } finally {
        setLoading(false);
      }
    };

    fetchTrace();
  }, [protocol, workflow, args]);

  const renderContent = () => {
    if (loading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>Error: {error.message}</div>;
    }

    if (!traceResult) {
      return null;
    }

    return <TraceViewerClient trace={traceResult} />;
  };

  return (
    <>
      <Card className="w-full gap-2 py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-base font-semibold">{header}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 text-sm text-muted-foreground">
          See the call workflow call trace and source code
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
