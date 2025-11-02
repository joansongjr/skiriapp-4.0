// components/ui/RingGauge.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
  value: number;            // 0-100
  size?: number;            // 直径
  thickness?: number;       // 线宽
  color?: string;           // 进度色
  trackColor?: string;      // 轨道色
  gapAngle?: number;        // 缺口角度（度数，0=整圆，建议 40~80）
  label?: string;           // 下方小文字
  valueFontSize?: number;   // 中间数字字号
};

export default function RingGauge({
  value,
  size = 64,
  thickness = 8,
  color = "#10b981",
  trackColor = "#e5e7eb",
  gapAngle = 60,
  label,
  valueFontSize = 16,
}: Props) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // 缺口占比
  const gapFraction = Math.max(0, Math.min(359, gapAngle)) / 360;
  // 有效可绘制弧长（剔除缺口后）
  const drawable = circumference * (1 - gapFraction);
  // 当前进度对应的弧长
  const progressLen = Math.max(0, Math.min(100, value)) / 100 * drawable;

  // 将缺口居中放到底部：先把圆整体旋转 -90 度到 12 点，再把 dash 偏移移动到缺口的一半
  // 这样缺口会落在 6 点方向，形似"仪表盘"
  const rotation = -90;
  const dashOffset = circumference * (gapFraction / 2);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* 轨道 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={`${drawable} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
          {/* 进度弧 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={`${progressLen} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        </Svg>

        {/* 中心数字 */}
        <View style={styles.center}>
          <Text style={[styles.value, { fontSize: valueFontSize }]}>{Math.round(value)}</Text>
        </View>
      </View>

      {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  center: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  value: { fontWeight: "800", color: "#111" },
  label: { marginTop: 6, fontSize: 12, color: "#6b7280", fontWeight: "600" },
});

