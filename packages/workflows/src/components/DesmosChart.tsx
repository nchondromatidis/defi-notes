import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog';

interface DesmosChartProps {
  graphId: string;
  height?: string;
  width?: string;
  expressionsCollapsed?: boolean;
  invertedColors?: boolean;
}

// Load Desmos script dynamically
const loadDesmosScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-desmos-api]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
    script.setAttribute('data-desmos-api', 'true');
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Desmos API'));
    document.head.appendChild(script);
  });
};

// Type for the calculator instance
type DesmosCalculator = {
  setState: (state: unknown) => void;
  destroy: () => void;
};

// Fetch graph state from Desmos
const fetchGraphState = async (graphId: string): Promise<unknown> => {
  const response = await fetch(`https://www.desmos.com/calculator/${graphId}?format=json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph state: ${response.status}`);
  }
  const data = await response.json();
  return data.state;
};

export const DesmosChart: React.FC<DesmosChartProps> = ({
  graphId,
  height = '500px',
  width = '100%',
  invertedColors = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const mainCalculatorRef = useRef<DesmosCalculator | null>(null);
  const modalCalculatorRef = useRef<DesmosCalculator | null>(null);

  // Initialize main calculator
  useEffect(() => {
    let isMounted = true;

    const initCalculator = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Desmos API
        await loadDesmosScript();

        if (!isMounted || !mainContainerRef.current) return;

        // Fetch graph state
        const state = await fetchGraphState(graphId);

        if (!isMounted || !mainContainerRef.current) return;

        // @ts-expect-error - Desmos is loaded globally
        if (!window.Desmos) {
          throw new Error('Desmos API not available');
        }

        // Create calculator
        // @ts-expect-error - Desmos is loaded globally
        const calculator = window.Desmos.GraphingCalculator(mainContainerRef.current, {
          expressions: false,
          expressionsCollapsed: true,
          invertedColors,
          keypad: false,
          settingsMenu: false,
          zoomButtons: false,
          lockViewport: true,
        });

        // Set the state
        calculator.setState(state);

        mainCalculatorRef.current = calculator;
        setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load graph');
          setIsLoading(false);
        }
      }
    };

    initCalculator();

    return () => {
      isMounted = false;
      if (mainCalculatorRef.current) {
        mainCalculatorRef.current.destroy();
        mainCalculatorRef.current = null;
      }
    };
  }, [graphId, invertedColors]);

  // Initialize modal calculator when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initModalCalculator = async () => {
      // Wait for the DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!isMounted || !modalContainerRef.current) return;

      try {
        // Fetch graph state
        const state = await fetchGraphState(graphId);

        if (!isMounted || !modalContainerRef.current) return;

        // @ts-expect-error - Desmos is loaded globally
        if (!window.Desmos) {
          throw new Error('Desmos API not available');
        }

        // Create calculator for modal
        // @ts-expect-error - Desmos is loaded globally
        const calculator = window.Desmos.GraphingCalculator(modalContainerRef.current, {
          expressions: true,
          expressionsCollapsed: false,
          invertedColors,
          keypad: false,
          settingsMenu: false,
          zoomButtons: true,
        });

        // Set the state
        calculator.setState(state);

        modalCalculatorRef.current = calculator;
      } catch (err) {
        console.error('Failed to initialize modal calculator:', err);
      }
    };

    initModalCalculator();

    return () => {
      isMounted = false;
      if (modalCalculatorRef.current) {
        modalCalculatorRef.current.destroy();
        modalCalculatorRef.current = null;
      }
    };
  }, [isOpen, graphId, invertedColors]);

  return (
    <>
      <div className="relative" style={{ width, height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-muted-foreground">Loading graph...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-destructive text-sm text-center px-4">{error}</div>
          </div>
        )}
        <div ref={mainContainerRef} className="overflow-hidden w-full h-full not-content" />
        {!isLoading && !error && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-0 right-4 bg-background/80 backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => setIsOpen(true)}
            aria-label="Expand chart"
          >
            <Maximize2 className="size-4" />
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none rounded-none max-w-[95vw] sm:max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 gap-0"
        >
          <DialogTitle className="sr-only">Desmos Graph {graphId}</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-34 right-2 z-50 bg-background/80 backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
          <div ref={modalContainerRef} className="w-full h-full " />
        </DialogContent>
      </Dialog>
    </>
  );
};
