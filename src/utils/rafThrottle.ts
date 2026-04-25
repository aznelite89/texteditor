export type RafThrottled<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void;
  flush: () => void;
};

/**
 * Throttle a function so it runs at most once per animation frame, with the
 * latest arguments. Returned function exposes `cancel` (drop pending call)
 * and `flush` (run pending call now).
 */
export function rafThrottle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
): RafThrottled<TArgs> {
  let frame: number | null = null;
  let lastArgs: TArgs | null = null;

  const flush = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    if (lastArgs) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  const cancel = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    lastArgs = null;
  };

  const throttled = ((...args: TArgs) => {
    lastArgs = args;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (lastArgs) {
        const queued = lastArgs;
        lastArgs = null;
        fn(...queued);
      }
    });
  }) as RafThrottled<TArgs>;

  throttled.cancel = cancel;
  throttled.flush = flush;
  return throttled;
}
