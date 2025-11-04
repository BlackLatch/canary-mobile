import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface HourglassButtonProps {
  /** Progress from 0 to 1 (0 = time expired, 1 = just checked in) */
  progress: number;
  /** Whether the hourglass is flipping */
  isFlipping: boolean;
  /** Size in pixels */
  size?: number;
  /** Color */
  color?: string;
}

export const HourglassButton: React.FC<HourglassButtonProps> = ({
  progress,
  isFlipping,
  size = 40,
  color = '#FFFFFF',
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sandHeightTop = useRef(new Animated.Value(progress)).current;
  const sandHeightBottom = useRef(new Animated.Value(1 - progress)).current;

  // Sand particle animations (3 particles for smooth flow)
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  // Flip animation when checking in
  useEffect(() => {
    if (isFlipping) {
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFlipping]);

  // Update sand levels based on progress
  useEffect(() => {
    Animated.parallel([
      Animated.timing(sandHeightTop, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(sandHeightBottom, {
        toValue: 1 - progress,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress]);

  // Continuous sand dropping animation
  useEffect(() => {
    if (progress > 0 && progress < 1 && !isFlipping) {
      const createParticleAnimation = (particleAnim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(particleAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(particleAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animations = Animated.parallel([
        createParticleAnimation(particle1, 0),
        createParticleAnimation(particle2, 267),
        createParticleAnimation(particle3, 533),
      ]);

      animations.start();

      return () => {
        animations.stop();
      };
    }
  }, [progress, isFlipping, particle1, particle2, particle3]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const topSandHeight = sandHeightTop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size * 0.25],
  });

  const bottomSandHeight = sandHeightBottom.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size * 0.25],
  });

  // Particle positions (falling from top to bottom through neck)
  const getParticleTranslateY = (particleAnim: Animated.Value) => {
    return particleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-(size * 0.35), size * 0.35], // From top bulb to bottom bulb
    });
  };

  const getParticleOpacity = (particleAnim: Animated.Value) => {
    return particleAnim.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [0, 0.8, 0.8, 0],
    });
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.hourglass, { transform: [{ rotate: rotation }] }]}>
        <View style={[styles.glassContainer, { width: size * 0.6, height: size * 0.9 }]}>
          {/* Top frame bar */}
          <View style={[styles.frameBar, { width: size * 0.65, height: 2, backgroundColor: color }]} />

          {/* Top triangle (pointing down) */}
          <View style={styles.triangleContainer}>
            {/* Outline triangle */}
            <View
              style={[
                styles.triangleDown,
                {
                  borderTopWidth: size * 0.4,
                  borderTopColor: color,
                  borderLeftWidth: size * 0.3,
                  borderRightWidth: size * 0.3,
                },
              ]}
            />
            {/* Sand in top triangle - accumulates at the bottom (point) */}
            <Animated.View
              style={[
                styles.sandTriangleDown,
                {
                  borderTopWidth: topSandHeight,
                  borderTopColor: color,
                  borderLeftWidth: topSandHeight.interpolate({
                    inputRange: [0, size * 0.4],
                    outputRange: [0, size * 0.3],
                  }),
                  borderRightWidth: topSandHeight.interpolate({
                    inputRange: [0, size * 0.4],
                    outputRange: [0, size * 0.3],
                  }),
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                },
              ]}
            />
          </View>

          {/* Center point / neck */}
          <View style={[styles.neckPoint, { height: size * 0.05 }]}>
            {/* Animated sand particles */}
            {progress > 0 && progress < 1 && !isFlipping && (
              <>
                <Animated.View
                  style={[
                    styles.fallingParticle,
                    {
                      backgroundColor: color,
                      width: 2,
                      height: 2,
                      borderRadius: 1,
                      opacity: getParticleOpacity(particle1),
                      transform: [{ translateY: getParticleTranslateY(particle1) }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.fallingParticle,
                    {
                      backgroundColor: color,
                      width: 2,
                      height: 2,
                      borderRadius: 1,
                      opacity: getParticleOpacity(particle2),
                      transform: [{ translateY: getParticleTranslateY(particle2) }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.fallingParticle,
                    {
                      backgroundColor: color,
                      width: 2,
                      height: 2,
                      borderRadius: 1,
                      opacity: getParticleOpacity(particle3),
                      transform: [{ translateY: getParticleTranslateY(particle3) }],
                    },
                  ]}
                />
              </>
            )}
          </View>

          {/* Bottom triangle (pointing up) */}
          <View style={styles.triangleContainer}>
            {/* Outline triangle */}
            <View
              style={[
                styles.triangleUp,
                {
                  borderBottomWidth: size * 0.4,
                  borderBottomColor: color,
                  borderLeftWidth: size * 0.3,
                  borderRightWidth: size * 0.3,
                },
              ]}
            />
            {/* Sand in bottom triangle */}
            <Animated.View
              style={[
                styles.sandTriangleUp,
                {
                  borderBottomWidth: bottomSandHeight,
                  borderBottomColor: color,
                  borderLeftWidth: bottomSandHeight.interpolate({
                    inputRange: [0, size * 0.4],
                    outputRange: [0, size * 0.3],
                  }),
                  borderRightWidth: bottomSandHeight.interpolate({
                    inputRange: [0, size * 0.4],
                    outputRange: [0, size * 0.3],
                  }),
                },
              ]}
            />
          </View>

          {/* Bottom frame bar */}
          <View style={[styles.frameBar, { width: size * 0.65, height: 2, backgroundColor: color }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourglass: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  glassContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  frameBar: {
    opacity: 0.4,
  },
  triangleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  triangleDown: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.2,
  },
  triangleUp: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.2,
  },
  sandTriangleDown: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
  },
  sandTriangleUp: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  neckPoint: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallingParticle: {
    position: 'absolute',
  },
});
