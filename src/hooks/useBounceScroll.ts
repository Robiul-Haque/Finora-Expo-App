/**
 * Ultra-lightweight Native Scroll Configuration
 * Eliminates all JS-bridge event throttling, CPU overhead, and frame drops.
 * Uses 100% native platform momentum and hardware-accelerated scrolling.
 */
export const useBounceScroll = () => {
  return {
    bounceAnim: null,
    scrollProps: {
      bounces: true,
      overScrollMode: 'always' as const,
      showsVerticalScrollIndicator: false,
      removeClippedSubviews: true,
    },
    bounceStyle: null,
  };
};

