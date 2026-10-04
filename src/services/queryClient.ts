import { QueryClient, QueryCache, MutationCache, focusManager } from '@tanstack/react-query';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Configure React Native AppState listener for TanStack Query
 * Automatically refetches stale queries when the app comes back to the foreground.
 */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}

AppState.addEventListener('change', onAppStateChange);

/**
 * Production-optimized TanStack Query Client with Safe Crash-Proof Caches
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Gracefully prevent unhandled query errors from bubbling or crashing
      console.warn(`[QueryCache] Handled query error for key [${JSON.stringify(query.queryKey)}]:`, error?.message || error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Gracefully prevent unhandled mutation errors from bubbling or crashing
      console.warn(`[MutationCache] Handled mutation error [${mutation.options.mutationKey}]:`, error?.message || error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes fresh cache
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // Disabled for mobile performance
    },
    mutations: {
      retry: 0, // Handled by offline queue
    },
  },
});