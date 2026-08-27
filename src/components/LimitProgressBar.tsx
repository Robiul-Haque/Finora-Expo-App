import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LimitProgressBarProps {
  usedAmount: number;
  totalLimit: number;
  label?: string;
  showPercentage?: boolean;
}

export const LimitProgressBar: React.FC<LimitProgressBarProps> = ({
  usedAmount,
  totalLimit,
  label = 'LIMIT USAGE',
  showPercentage = true,
}) => {
  const { theme } = useTheme();

  const percentage = totalLimit > 0 ? Math.min(100, Math.round((usedAmount / totalLimit) * 100)) : 0;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: percentage,
      friction: 8,
      tension: 45,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  // Determine color based on threshold
  let barColor = theme.primary;
  if (percentage > 85) {
    barColor = theme.danger;
  } else if (percentage > 60) {
    barColor = theme.warning;
  } else {
    barColor = theme.primary;
  }

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        {showPercentage && (
          <Text style={[styles.percentage, { color: barColor }]}>
            {percentage}%
          </Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: theme.progressBarBg }]}>
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  percentage: {
    fontSize: 11,
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
