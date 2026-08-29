import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Configure React Native AppState listener for TanStack Query
 * Automatically refetches stale queries when the app comes back to the foreground.
 */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

const subscription = AppState.addEventListener('change', onAppStateChange);

/**
 * Production-optimized TanStack Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes fresh cache
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // Disabled for mobile performance
    },
    mutations: {
      retry: 1,
    },
  },
});
