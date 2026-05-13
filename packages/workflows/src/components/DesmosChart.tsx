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

const waitForElement = (ref: React.RefObject<HTMLDivElement | null>): Promise<HTMLDivElement> => {
  return new Promise((resolve) => {
    const check = () => {
      if (ref.current) {
        resolve(ref.current);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
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
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('chartId') === graphId;
  });

  useEffect(() => {
    if (isOpen) {
      document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getCurrentTheme);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const mainCalculatorRef = useRef<DesmosCalculator | null>(null);
  const modalCalculatorRef = useRef<DesmosCalculator | null>(null);
  const graphStateRef = useRef<unknown>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const desmosScriptPromiseRef = useRef<Promise<void> | null>(null);

  const ensureDesmosLoaded = useCallback(() => {
    if (!desmosScriptPromiseRef.current) {
      desmosScriptPromiseRef.current = loadDesmosScript();
    }
    return desmosScriptPromiseRef.current;
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      const url = new URL(window.location.href);
      if (open) {
        url.searchParams.set('chartId', graphId);
        url.hash = 'chart';
        window.history.pushState(null, '', url.pathname + url.search + url.hash);
      } else {
        url.searchParams.delete('chartId');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    },
    [graphId]
  );

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

        // Load Desmos API (shared promise avoids race conditions)
        await ensureDesmosLoaded();

        if (!isMounted || !mainContainerRef.current) return;

        // Fetch graph state
        const state = await fetchGraphState(graphId);
        graphStateRef.current = state;

        if (!isMounted || !mainContainerRef.current) return;

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
  }, [graphId, createCalculator, ensureDesmosLoaded]);

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

  // Sync isOpen with URL changes (browser back/forward)
  useEffect(() => {
    const onUrlChange = () => {
      const open = new URLSearchParams(window.location.search).get('chartId') === graphId;
      setIsOpen(open);
      if (open) {
        document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', onUrlChange);
    return () => {
      window.removeEventListener('popstate', onUrlChange);
    };
  }, [graphId]);

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
      setModalError(null);

      try {
        // Wait for the Desmos script (shared promise) and DOM element
        await ensureDesmosLoaded();
        const container = await waitForElement(modalContainerRef);

        if (!isMounted) return;

        // Fetch graph state if not cached
        let state = graphStateRef.current;
        if (!state) {
          state = await fetchGraphState(graphId);
          graphStateRef.current = state;
        }

        if (!isMounted) return;

        // Create calculator for modal
        const calculator = createCalculator(container, true);

        // Set the state
        calculator.setState(state);

        modalCalculatorRef.current = calculator;
      } catch (err) {
        if (isMounted) {
          setModalError(err instanceof Error ? err.message : 'Failed to load graph');
          console.error('Failed to initialize modal calculator:', err);
        }
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
  }, [isOpen, graphId, createCalculator, ensureDesmosLoaded]);

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
            onClick={() => handleOpenChange(true)}
            aria-label="Expand chart"
          >
            <Maximize2 />
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="border-none rounded-none max-w-[95vw] sm:max-w-[95vw] max-h-[95dvh] w-[95vw] h-[95dvh] p-0 gap-0"
        >
          <DialogTitle className="sr-only">Desmos Graph {graphId}</DialogTitle>
          <DialogClose asChild>
            <Button variant="secondary" size="icon-sm" className="absolute top-2 right-12 z-50" aria-label="Close">
              <X />
            </Button>
          </DialogClose>
          {modalError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="text-destructive text-sm text-center px-4">{modalError}</div>
            </div>
          )}
          <div ref={modalContainerRef} className="w-full h-full " />
        </DialogContent>
      </Dialog>
    </>
  );
};
