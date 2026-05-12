import React, { useEffect, useRef, useState, useCallback } from 'react';
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
interface DesmosCalculator {
  setState: (state: unknown) => void;
  destroy: () => void;
  updateSettings: (settings: { invertedColors?: boolean }) => void;
}

// Fetch graph state from Desmos
const fetchGraphState = async (graphId: string): Promise<unknown> => {
  const response = await fetch(`https://www.desmos.com/calculator/${graphId}?format=json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph state: ${response.status}`);
  }
  const data = await response.json();
  return data.state;
};

// Get current theme from document
const getCurrentTheme = (): 'dark' | 'light' => {
  if (typeof document === 'undefined') return 'dark';
  const theme = document.documentElement.dataset.theme;
  return theme === 'light' ? 'light' : 'dark';
};

// Determine invertedColors based on theme (dark theme = inverted colors)
const getInvertedColorsFromTheme = (theme: 'dark' | 'light'): boolean => {
  return theme === 'dark';
};

export const DesmosChart: React.FC<DesmosChartProps> = ({
  graphId,
  height = '500px',
  width = '100%',
  invertedColors: invertedColorsProp,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getCurrentTheme);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const mainCalculatorRef = useRef<DesmosCalculator | null>(null);
  const modalCalculatorRef = useRef<DesmosCalculator | null>(null);
  const graphStateRef = useRef<unknown>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Determine invertedColors based on prop or theme
  const invertedColors = invertedColorsProp ?? getInvertedColorsFromTheme(theme);

  // Create calculator instance
  const createCalculator = useCallback(
    (container: HTMLDivElement, isModal: boolean): DesmosCalculator => {
      // @ts-expect-error - Desmos is loaded globally
      const calculator = window.Desmos.GraphingCalculator(container, {
        expressions: isModal,
        expressionsCollapsed: !isModal,
        invertedColors,
        keypad: false,
        settingsMenu: false,
        zoomButtons: isModal,
        lockViewport: !isModal,
      }) as DesmosCalculator;

      return calculator;
    },
    [invertedColors]
  );

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
        graphStateRef.current = state;

        if (!isMounted || !mainContainerRef.current) return;

        // @ts-expect-error - Desmos is loaded globally
        if (!window.Desmos) {
          throw new Error('Desmos API not available');
        }

        // Create calculator
        const calculator = createCalculator(mainContainerRef.current, false);

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
  }, [graphId, createCalculator]);

  // Watch for theme changes
  useEffect(() => {
    // Create observer to watch for theme attribute changes
    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = getCurrentTheme();
          setTheme(newTheme);
        }
      });
    });

    observerRef.current.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Update calculator colors when theme changes
  useEffect(() => {
    if (!mainCalculatorRef.current) return;

    try {
      // Try to update settings dynamically
      mainCalculatorRef.current.updateSettings({ invertedColors });
    } catch (err) {
      // Fallback: if updateSettings doesn't work, we need to recreate
      // This shouldn't happen based on the API docs, but just in case
      console.warn('Desmos updateSettings failed, colors may not update:', err);
    }
  }, [invertedColors]);

  // Initialize modal calculator when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initModalCalculator = async () => {
      // Wait for the DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!isMounted || !modalContainerRef.current) return;

      try {
        // Fetch graph state if not cached
        let state = graphStateRef.current;
        if (!state) {
          state = await fetchGraphState(graphId);
          graphStateRef.current = state;
        }

        if (!isMounted || !modalContainerRef.current) return;

        // @ts-expect-error - Desmos is loaded globally
        if (!window.Desmos) {
          throw new Error('Desmos API not available');
        }

        // Create calculator for modal
        const calculator = createCalculator(modalContainerRef.current, true);

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
  }, [isOpen, graphId, createCalculator]);

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
            variant="secondary"
            size="icon-sm"
            className="absolute top-0 right-4 z-50"
            onClick={() => setIsOpen(true)}
            aria-label="Expand chart"
          >
            <Maximize2 />
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
            <Button variant="secondary" size="icon-sm" className="absolute top-2 right-12 z-50" aria-label="Close">
              <X />
            </Button>
          </DialogClose>
          <div ref={modalContainerRef} className="w-full h-full " />
        </DialogContent>
      </Dialog>
    </>
  );
};
