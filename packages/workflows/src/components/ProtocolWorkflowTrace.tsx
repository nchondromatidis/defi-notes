import { TraceViewerClient } from '@protocol-lens/evm-lens-ui/components/TraceViewerClient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog';
import { X } from 'lucide-react';
import { ViewTrace } from './ViewTrace';
import {
  getProtocolWorkflowsRegistry,
  type ProtocolWorkflowsRegistry,
  runWorkflow,
  type MethodArgs,
  type WorkflowNames,
} from '../protocols/run-workflow.ts';
import type { TraceResult } from '@protocol-lens/evm-lens-ui/types/TraceResult';

const WORKFLOW_ID_PARAM = 'workflowId';

function getWorkflowIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(WORKFLOW_ID_PARAM);
}

function setWorkflowIdInUrl(workflowId: string): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get(WORKFLOW_ID_PARAM) === workflowId) return;
  url.searchParams.set(WORKFLOW_ID_PARAM, workflowId);
  window.history.pushState({}, '', url.pathname + url.search + url.hash);
}

function removeWorkflowIdFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(WORKFLOW_ID_PARAM)) return;
  url.searchParams.delete(WORKFLOW_ID_PARAM);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

const getResourcesBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('ProtocolWorkflowTrace must run in browser environment');
  }
  return `${window.location.origin}/protocol-lens`;
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
  const workflowId = `${String(protocol)}-${String(workflow)}`;

  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getWorkflowIdFromUrl() === workflowId;
  });

  const dialogRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setWorkflowIdInUrl(workflowId);
      } else {
        removeWorkflowIdFromUrl();
      }
      setIsOpen(open);
    },
    [workflowId]
  );

  useEffect(() => {
    const onPopState = () => {
      const urlId = getWorkflowIdFromUrl();
      setIsOpen(urlId === workflowId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [workflowId]);

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
      <ViewTrace
        workflowName={header}
        infoMessages={infoMessages}
        warnMessages={warnMessages}
        disabled={!traceResult || loading || !!error}
        onStartTrace={() => handleOpenChange(true)}
      />

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            <Button variant="ghost" size="icon-sm" className="absolute top-4 right-4 z-50" aria-label="Close">
              <X className="size-4" />
            </Button>
          </DialogClose>
          {traceResult && renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};
