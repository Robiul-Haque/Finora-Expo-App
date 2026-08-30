import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../services/network';
import { syncService } from '../services/sync/syncService';
import { useTheme } from '../context/ThemeContext';
import { useLedger } from '../context/LedgerContext';

const NetworkStatusBannerComponent: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { refetch } = useLedger();

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.retryAll();
      if (refetch) await refetch();
    } finally {
      setIsSyncing(false);
    }
  };

  // Only show banner when offline or when there are pending sync items
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: !isOnline ? '#FEF3C7' : '#EFF6FF',
          borderColor: !isOnline ? '#F59E0B' : theme.primary,
        },
      ]}
    >
      <View style={styles.left}>
        <Ionicons
          name={!isOnline ? 'cloud-offline-outline' : 'sync-outline'}
          size={16}
          color={!isOnline ? '#D97706' : theme.primary}
        />
        <Text style={[styles.text, { color: !isOnline ? '#92400E' : '#1E40AF' }]}>
          {!isOnline
            ? `Offline Mode ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`
            : isSyncing
              ? 'Syncing changes to cloud...'
              : `${pendingCount} item(s) pending sync`}
        </Text>
      </View>

      {isOnline && (
        <TouchableOpacity
          style={[styles.syncBtn, { backgroundColor: theme.primary }]}
          onPress={handleManualSync}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={12} color="#FFFFFF" />
          <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const NetworkStatusBanner = React.memo(NetworkStatusBannerComponent);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});