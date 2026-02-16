/**
 * Lightweight endpoint duration logger.
 *
 * Usage:
 *   const timer = endpointTimer('GET /api/theater-tech/dayboard');
 *   // ... do work ...
 *   timer.end({ cases: 15 });  // logs structured JSON to stdout
 *
 * Output format (structured, parseable by log aggregators):
 *   {"event":"endpoint","method":"GET","path":"/api/theater-tech/dayboard","durationMs":42,"meta":{"cases":15}}
 *
 * No external APM dependency — just structured server logs.
 */

export interface EndpointTimerResult {
  end: (meta?: Record<string, unknown>) => void;
}

export function endpointTimer(label: string): EndpointTimerResult {
  const start = performance.now();

  // Parse "METHOD /path" format
  const spaceIdx = label.indexOf(' ');
  const method = spaceIdx > 0 ? label.substring(0, spaceIdx) : 'UNKNOWN';
  const path = spaceIdx > 0 ? label.substring(spaceIdx + 1) : label;

  return {
    end(meta?: Record<string, unknown>) {
      const durationMs = Math.round(performance.now() - start);
      const entry: Record<string, unknown> = {
        event: 'endpoint',
        method,
        path,
        durationMs,
      };
      if (meta && Object.keys(meta).length > 0) {
        entry.meta = meta;
      }

      // Warn threshold: log at warn level if > 1s
      if (durationMs > 1000) {
        console.warn(JSON.stringify(entry));
      } else {
        console.log(JSON.stringify(entry));
      }
    },
  };
}
