/**
 * Browser API Mocks
 *
 * Provides lightweight mocks for browser APIs that are not fully polyfilled
 * by jsdom or that require controlled behavior in tests.
 */

export function mockBrowserGlobals(): void {
  mockMatchMedia();
  mockResizeObserver();
  mockIntersectionObserver();
  mockScrollApis();
  mockAnimationFrame();
}

function mockMatchMedia(): void {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function mockResizeObserver(): void {
  class ResizeObserver {
    observe(): void { }
    unobserve(): void { }
    disconnect(): void { }
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserver,
  });
}

function mockIntersectionObserver(): void {
  class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe(): void { }
    unobserve(): void { }
    disconnect(): void { }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserver,
  });
}

function mockScrollApis(): void {
  Object.defineProperty(globalThis.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(globalThis.HTMLElement.prototype, 'scroll', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(globalThis.HTMLElement.prototype, 'scrollBy', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(globalThis.HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: () => {},
  });
}

function mockAnimationFrame(): void {
  const rafTimeouts: Record<number, ReturnType<typeof setTimeout>> = {};
  let nextRafId = 1;

  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = nextRafId++;
    rafTimeouts[id] = (globalThis as any).setTimeout(() => callback(Date.now()), 0);
    return id;
  };

  globalThis.cancelAnimationFrame = (id: number): void => {
    const timeout = rafTimeouts[id];
    if (timeout !== undefined) {
      (globalThis as any).clearTimeout(timeout);
      delete rafTimeouts[id];
    }
  };
}
