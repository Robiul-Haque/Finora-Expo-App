import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const SkeletonBox: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = '100%', height = 16, borderRadius = 6, style }) => {
  const { isDarkMode } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDarkMode ? '#2C3036' : '#E5E9F0',
          opacity: opacityAnim,
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
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#3A3F47' : '#E2E8F0' }]} />
      <View style={styles.cardInner}>
        <View style={styles.rowSpace}>
          <SkeletonBox width={130} height={18} borderRadius={4} />
          <SkeletonBox width={65} height={20} borderRadius={10} />
        </View>

        <View style={styles.bentoRow}>
          <View style={styles.bentoBox}>
            <SkeletonBox width={60} height={11} style={{ marginBottom: 6 }} />
            <SkeletonBox width={90} height={18} />
          </View>
          <View style={styles.bentoBox}>
            <SkeletonBox width={60} height={11} style={{ marginBottom: 6 }} />
            <SkeletonBox width={90} height={18} />
          </View>
        </View>

        <View style={{ gap: 6, marginTop: 4 }}>
          <View style={styles.rowSpace}>
            <SkeletonBox width={100} height={12} />
            <SkeletonBox width={40} height={12} />
          </View>
          <SkeletonBox width="100%" height={6} borderRadius={3} />
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
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#3A3F47' : '#E2E8F0' }]} />
      <View style={styles.txInner}>
        <View style={styles.rowSpace}>
          <SkeletonBox width={110} height={14} borderRadius={4} />
          <SkeletonBox width={80} height={16} borderRadius={4} />
        </View>
        <View style={[styles.rowSpace, { marginTop: 8 }]}>
          <SkeletonBox width={140} height={12} />
          <SkeletonBox width={60} height={12} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  accountCardSkeleton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
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
    gap: 12,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoBox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  txSkeleton: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
  },
  txInner: {
    paddingLeft: 4,
  },
});
