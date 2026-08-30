import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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
 * Hook to get real-time network connectivity status
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    NetInfo.fetch().then((state) => {
      if (!isMounted) return;
      const online = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsOnline(online);
      setConnectionType(state.type);
    });

    // Event listener
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!isMounted) return;
      const online = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsOnline(online);
      setConnectionType(state.type);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isOnline, connectionType };
};