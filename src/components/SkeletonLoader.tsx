import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Global shared animated values for seamless 60fps shimmer wave
const sharedShimmerAnim = new Animated.Value(0);
const sharedPulseAnim = new Animated.Value(0.45);

let activeSkeletonCount = 0;
let shimmerAnimation: Animated.CompositeAnimation | null = null;

const startShimmer = () => {
  activeSkeletonCount++;
  if (activeSkeletonCount === 1) {
    shimmerAnimation = Animated.loop(
      Animated.parallel([
        Animated.timing(sharedShimmerAnim, {
          toValue: 1,
          duration: 1350,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(sharedPulseAnim, {
            toValue: 0.9,
            duration: 675,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sharedPulseAnim, {
            toValue: 0.45,
            duration: 675,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    shimmerAnimation.start();
  }
};

const stopShimmer = () => {
  activeSkeletonCount = Math.max(0, activeSkeletonCount - 1);
  if (activeSkeletonCount === 0 && shimmerAnimation) {
    shimmerAnimation.stop();
    shimmerAnimation = null;
    sharedShimmerAnim.setValue(0);
    sharedPulseAnim.setValue(0.45);
  }
};

const shimmerTranslate = sharedShimmerAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [-260, 480],
});

/**
 * Modern High-Performance Shimmering Box
 */
export const SkeletonBox: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = '100%', height = 16, borderRadius = 6, style }) => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    startShimmer();
    return () => {
      stopShimmer();
    };
  }, []);

  const baseBg = isDarkMode ? '#252932' : '#E2E8F0';
  const highlightColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)';

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseBg,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: highlightColor,
            opacity: sharedPulseAnim,
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />
    </View>
  );
};

/**
 * Shimmering Spreadsheet Skeleton matching ExcelTableView
 */
export const ExcelTableSkeleton: React.FC = () => {
  const { theme, isDarkMode } = useTheme();

  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const headerBg = isDarkMode ? '#20242B' : '#F1F5F9';

  return (
    <View style={[styles.tableContainer, { backgroundColor: theme.card, borderColor }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableInner}>
        <View style={{ width: 504 }}>
          {/* Header Row */}
          <View style={[styles.tableHeaderRow, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
            <View style={[styles.colNumber, { alignItems: 'flex-start' }]}>
              <SkeletonBox width={54} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colBalance, { alignItems: 'center' }]}>
              <SkeletonBox width={56} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colDailyLimit, { alignItems: 'center' }]}>
              <SkeletonBox width={68} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colUsed, { alignItems: 'center' }]}>
              <SkeletonBox width={46} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colRemaining, { alignItems: 'center' }]}>
              <SkeletonBox width={64} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colAction, { alignItems: 'flex-end' }]}>
              <SkeletonBox width={26} height={12} borderRadius={3} />
            </View>
          </View>

          {/* 5 Shimmer Data Rows */}
          {[1, 2, 3, 4, 5].map((key, index) => (
            <View
              key={key}
              style={[
                styles.tableDataRow,
                {
                  borderBottomColor: borderColor,
                  backgroundColor: index % 2 === 1 ? (isDarkMode ? 'rgba(255, 255, 255, 0.025)' : '#F8FAFC') : 'transparent',
                },
              ]}
            >
              <View style={[styles.colNumber, { alignItems: 'flex-start' }]}>
                <SkeletonBox width={72} height={13} borderRadius={3} />
              </View>
              <View style={[styles.colBalance, { alignItems: 'center' }]}>
                <SkeletonBox width={60} height={13} borderRadius={3} />
              </View>
              <View style={[styles.colDailyLimit, { alignItems: 'center' }]}>
                <SkeletonBox width={64} height={13} borderRadius={3} />
              </View>
              <View style={[styles.colUsed, { alignItems: 'center' }]}>
                <SkeletonBox width={52} height={13} borderRadius={3} />
              </View>
              <View style={[styles.colRemaining, { alignItems: 'center' }]}>
                <SkeletonBox width={58} height={13} borderRadius={3} />
              </View>
              <View style={[styles.colAction, { alignItems: 'flex-end' }]}>
                <SkeletonBox width={20} height={20} borderRadius={10} />
              </View>
            </View>
          ))}

          {/* Footer Total Row */}
          <View style={[styles.tableFooterRow, { backgroundColor: headerBg, borderTopColor: borderColor }]}>
            <View style={[styles.colNumber, { alignItems: 'flex-start' }]}>
              <SkeletonBox width={44} height={12} borderRadius={3} />
            </View>
            <View style={[styles.colBalance, { alignItems: 'center' }]}>
              <SkeletonBox width={62} height={13} borderRadius={3} />
            </View>
            <View style={[styles.colDailyLimit, { alignItems: 'center' }]}>
              <SkeletonBox width={66} height={13} borderRadius={3} />
            </View>
            <View style={[styles.colUsed, { alignItems: 'center' }]}>
              <SkeletonBox width={54} height={13} borderRadius={3} />
            </View>
            <View style={[styles.colRemaining, { alignItems: 'center' }]}>
              <SkeletonBox width={60} height={13} borderRadius={3} />
            </View>
            <View style={styles.colAction} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Shimmering Transaction Card matching TransactionItem
 */
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
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#3B4252' : '#CBD5E1' }]} />
      <View style={styles.txInner}>
        {/* Top line: Type and Amount */}
        <View style={styles.rowSpace}>
          <View style={styles.rowInline}>
            <SkeletonBox width={14} height={14} borderRadius={7} style={{ marginRight: 6 }} />
            <SkeletonBox width={100} height={13} borderRadius={4} />
          </View>
          <SkeletonBox width={78} height={18} borderRadius={4} />
        </View>

        {/* Middle line: SIM Phone Number Flow */}
        <View style={[styles.rowSpace, { marginTop: 8 }]}>
          <SkeletonBox width={140} height={14} borderRadius={4} />
          <SkeletonBox width={56} height={11} borderRadius={3} />
        </View>

        {/* Bottom meta strip: Margin & Running Balance */}
        <View style={[styles.txBottomStrip, { borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' }]}>
          <View style={styles.rowInline}>
            <SkeletonBox width={60} height={11} borderRadius={3} style={{ marginRight: 10 }} />
            <SkeletonBox width={70} height={11} borderRadius={3} />
          </View>
          <SkeletonBox width={64} height={11} borderRadius={3} />
        </View>
      </View>
    </View>
  );
};

/**
 * Shimmering SIM Account Card matching AccountCard
 */
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
      <View style={[styles.skeletonLeftBar, { backgroundColor: isDarkMode ? '#3B4252' : '#CBD5E1' }]} />
      <View style={styles.cardInner}>
        <View style={styles.rowSpace}>
          <SkeletonBox width={140} height={20} borderRadius={6} />
          <SkeletonBox width={65} height={20} borderRadius={10} />
        </View>

        <View style={styles.bentoRow}>
          <View style={[styles.bentoBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <SkeletonBox width={55} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBox width={90} height={16} borderRadius={4} />
          </View>
          <View style={[styles.bentoBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <SkeletonBox width={55} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBox width={90} height={16} borderRadius={4} />
          </View>
        </View>

        <View style={{ gap: 7, marginTop: 4 }}>
          <View style={styles.rowSpace}>
            <SkeletonBox width={110} height={11} />
            <SkeletonBox width={45} height={11} />
          </View>
          <SkeletonBox width="100%" height={7} borderRadius={4} />
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
        <SkeletonBox width={100} height={13} />
        <SkeletonBox width={26} height={26} borderRadius={13} />
      </View>
      <SkeletonBox width={130} height={22} borderRadius={6} style={{ marginTop: 12, marginBottom: 8 }} />
      <SkeletonBox width={85} height={11} />
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableInner: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1.5,
    minHeight: 38,
  },
  colNumber: { width: 94, paddingLeft: 8, paddingRight: 4, justifyContent: 'center' },
  colBalance: { width: 88, paddingHorizontal: 4, justifyContent: 'center' },
  colDailyLimit: { width: 98, paddingHorizontal: 4, justifyContent: 'center' },
  colUsed: { width: 80, paddingHorizontal: 4, justifyContent: 'center' },
  colRemaining: { width: 96, paddingHorizontal: 4, justifyContent: 'center' },
  colAction: { width: 48, paddingRight: 8, justifyContent: 'center' },
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
    gap: 13,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInline: {
    flexDirection: 'row',
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
    padding: 13,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
  },
  txInner: {
    paddingLeft: 6,
    gap: 4,
  },
  txBottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  statCardSkeleton: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
  },
});

export default SkeletonBox;
