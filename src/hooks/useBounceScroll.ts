import { useRef } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

/**
 * Custom hook to provide true elastic spring rubber-band bounce animation on scroll
 * Works consistently across all Android and iOS devices.
 */
export const useBounceScroll = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 0) {
      // Elastic rubber-band resistance formula
      bounceAnim.setValue(-y * 0.55);
    } else {
      bounceAnim.setValue(0);
    }
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 0) {
      Animated.spring(bounceAnim, {
        toValue: 0,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }).start();
    }
  };

  return {
    bounceAnim,
    scrollProps: {
      onScroll: handleScroll,
      onScrollEndDrag: handleScrollEndDrag,
      scrollEventThrottle: 16,
      bounces: true,
      alwaysBounceVertical: true,
      overScrollMode: 'always' as const,
      decelerationRate: 'normal' as const,
    },
    bounceStyle: {
      transform: [{ translateY: bounceAnim }],
    },
  };
};
