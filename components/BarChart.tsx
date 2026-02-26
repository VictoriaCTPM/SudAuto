import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';

interface DataPoint {
  day: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  accentColor?: string;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 160, accentColor, formatValue }: BarChartProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const color = accentColor ?? theme.accent;

  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const barPad = barWidth * 0.25;
  const chartH = height - 28;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <Line x1="0" y1={chartH} x2="100" y2={chartH} stroke={theme.separator} strokeWidth="0.3" />
        {data.map((d, i) => {
          const barH = (d.value / maxValue) * chartH * 0.88;
          const x = i * barWidth + barPad / 2;
          const w = barWidth - barPad;
          const y = chartH - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={barH > 0 ? y : chartH - 1}
              width={w}
              height={barH > 0 ? barH : 1}
              rx="1"
              fill={color}
              opacity={barH > 0 ? 1 : 0.25}
            />
          );
        })}
        {data.map((d, i) => {
          const cx = i * barWidth + barWidth / 2;
          return (
            <SvgText
              key={i}
              x={cx}
              y={height - 4}
              textAnchor="middle"
              fontSize="4.5"
              fill={theme.textTertiary}
            >
              {d.day}
            </SvgText>
          );
        })}
      </Svg>
      {maxValue > 0 && (
        <View style={styles.maxLabel}>
          <Text style={[styles.maxText, { color: theme.textTertiary }]}>
            {formatValue ? formatValue(maxValue) : maxValue.toFixed(0)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  maxLabel: {
    position: 'absolute',
    top: 2,
    right: 0,
  },
  maxText: {
    fontSize: 10,
  },
});
