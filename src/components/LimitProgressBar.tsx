import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LimitProgressBarProps {
  usedAmount: number;
  totalLimit: number;
  label?: string;
  showPercentage?: boolean;
}

const LimitProgressBarComponent: React.FC<LimitProgressBarProps> = ({ usedAmount, totalLimit, label = 'LIMIT USAGE', showPercentage = true }) => {
  const { theme, isDarkMode } = useTheme();

  const percentage =
    totalLimit > 0 ? Math.min(100, Math.max(0, Math.round((usedAmount / totalLimit) * 100))) : 0;

  // Initialized directly with the percentage value (clean, instant, zero flicker)
  const animatedWidth = useRef(new Animated.Value(percentage)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  // Determine color based on threshold
  const barColor = React.useMemo(() => {
    if (percentage > 85) return theme.danger;
    if (percentage > 60) return theme.warning;
    return theme.primary;
  }, [percentage, theme.danger, theme.warning, theme.primary]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const trackBg = isDarkMode ? '#28203A' : '#F1E8F0';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text
          style={[styles.label, { color: theme.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
        {showPercentage && (
          <Text style={[styles.percentage, { color: barColor }]} numberOfLines={1}>
            {percentage}%
          </Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthInterpolation,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

export const LimitProgressBar = React.memo(LimitProgressBarComponent);

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 6,
  },
  percentage: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 0,
  },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});