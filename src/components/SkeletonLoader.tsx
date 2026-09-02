import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Shared native driver pulse value
const sharedPulseAnim = new Animated.Value(0.5);

let isPulseRunning = false;
const startSharedPulse = () => {
  if (isPulseRunning) return;
  isPulseRunning = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(sharedPulseAnim, {
        toValue: 0.9,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(sharedPulseAnim, {
        toValue: 0.45,
        duration: 800,
        useNativeDriver: true,
      }),
    ])
  ).start();
};

export const SkeletonBox: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = '100%', height = 16, borderRadius = 6, style }) => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    startSharedPulse();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDarkMode ? '#414754' : '#E2E8F0',
          opacity: sharedPulseAnim,
        },
        style,
      ]}
    />
  );
};

export const AccountCardSkeleton: React.FC = () => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.accountCardSkeleton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#4A5568' : '#CBD5E1' }]} />
      <View style={styles.cardInner}>
        <View style={styles.rowSpace}>
          <SkeletonBox width={140} height={20} borderRadius={6} />
          <SkeletonBox width={70} height={22} borderRadius={12} />
        </View>

        <View style={styles.bentoRow}>
          <View style={[styles.bentoBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <SkeletonBox width={60} height={11} style={{ marginBottom: 8 }} />
            <SkeletonBox width={95} height={18} borderRadius={4} />
          </View>
          <View style={[styles.bentoBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <SkeletonBox width={60} height={11} style={{ marginBottom: 8 }} />
            <SkeletonBox width={95} height={18} borderRadius={4} />
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={styles.rowSpace}>
            <SkeletonBox width={110} height={12} />
            <SkeletonBox width={45} height={12} />
          </View>
          <SkeletonBox width="100%" height={8} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

export const TransactionItemSkeleton: React.FC = () => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.txSkeleton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#4A5568' : '#CBD5E1' }]} />
      <View style={styles.txInner}>
        <View style={styles.rowSpace}>
          <SkeletonBox width={120} height={16} borderRadius={4} />
          <SkeletonBox width={85} height={18} borderRadius={4} />
        </View>
        <View style={[styles.rowSpace, { marginTop: 10 }]}>
          <SkeletonBox width={150} height={13} borderRadius={4} />
          <SkeletonBox width={65} height={13} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

export const StatCardSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.statCardSkeleton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.rowSpace}>
        <SkeletonBox width={110} height={14} />
        <SkeletonBox width={28} height={28} borderRadius={14} />
      </View>
      <SkeletonBox width={140} height={24} borderRadius={6} style={{ marginTop: 12, marginBottom: 8 }} />
      <SkeletonBox width={90} height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  accountCardSkeleton: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
  },
  skeletonLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardInner: {
    paddingLeft: 4,
    gap: 14,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  txSkeleton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
  },
  txInner: {
    paddingLeft: 6,
  },
  statCardSkeleton: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
  },
});
