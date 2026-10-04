import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import syncService from './sync/syncService';

/**
 * Configure TanStack Query onlineManager with NetInfo
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && (state.isInternetReachable ?? true));
    setOnline(isOnline);
  });
});

/**
 * Hook to get real-time network connectivity status and sync queue metrics
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    NetInfo.fetch().then((state) => {
      if (!isMounted) return;
      const online = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsOnline(online);
      setConnectionType(state.type || 'unknown');
    }).catch(() => {});

    // Event listener for network changes
    const unsubscribeNet = NetInfo.addEventListener((state: NetInfoState) => {
      if (!isMounted) return;
      const online = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsOnline(online);
      setConnectionType(state.type || 'unknown');
      if (online) {
        // Trigger queue processing automatically on reconnection
        syncService.processQueue().catch(() => {});
      }
    });

    // Event listener for sync queue count
    const unsubscribeSync = syncService.subscribe((count) => {
      if (!isMounted) return;
      setPendingSyncCount(count);
    });

    return () => {
      isMounted = false;
      unsubscribeNet();
      unsubscribeSync();
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    pendingSyncCount,
  };
};