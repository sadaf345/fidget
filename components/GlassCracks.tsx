import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { CrackLine } from '@/lib/glass';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

interface GlassCracksProps {
  lines: CrackLine[];
  width: number;
  height: number;
  /** 0..1, drawn on the JS thread (SVG stroke props can't use the native driver). */
  progress: Animated.Value;
  opacity: Animated.Value;
}

/** Thin cracks that run out across the whole surface as `progress` goes from 0 to 1. */
export default function GlassCracks({ lines, width, height, progress, opacity }: GlassCracksProps) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width={width} height={height}>
        {lines.map((line, i) => (
          <AnimatedPolyline
            key={i}
            points={line.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.55 * line.weight}
            strokeWidth={line.weight === 1 ? 1 : 0.75}
            strokeLinejoin="bevel"
            strokeDasharray={[line.length, line.length]}
            strokeDashoffset={progress.interpolate({
              inputRange: [line.start, line.end],
              outputRange: [line.length, 0],
              extrapolate: 'clamp',
            })}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
