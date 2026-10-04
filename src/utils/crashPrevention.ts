/**
 * Global Crash Prevention, Security & Production Log Stripping
 * Ensures that unexpected JavaScript runtime errors or unhandled promise rejections
 * do not abruptly terminate the application, and strips all console logs in production
 * to prevent sensitive financial data leakage.
 */

export function setupCrashPrevention() {
  // 1. Production Console Sanitization (Ensure zero sensitive data leaks)
  if (!__DEV__) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.warn = noop;
    console.error = noop;
    console.table = noop;
    console.trace = noop;
  }

  // 2. React Native global JS error handler
  if (typeof (global as any).ErrorUtils !== 'undefined') {
    const errorUtils = (global as any).ErrorUtils;
    const previousHandler = errorUtils.getGlobalHandler?.();

    errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      // In development, let developer know
      if (__DEV__) {
        console.warn('[CrashPrevention] Caught unhandled JS error:', error?.message || error);
        if (previousHandler && !isFatal) {
          try {
            previousHandler(error, false);
          } catch {
            // Swallow
          }
        }
      }
      // In production, swallow error gracefully to prevent app termination
    });
  }

  // 3. Unhandled Promise Rejections (for web and JS engine)
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', (event: any) => {
      if (event) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (__DEV__) {
          console.warn('[CrashPrevention] Caught unhandled promise rejection:', event.reason?.message || event.reason);
        }
      }
    });

    window.addEventListener('error', (event: any) => {
      if (__DEV__) {
        console.warn('[CrashPrevention] Caught window runtime error:', event?.message || event);
      }
    });
  }
}
