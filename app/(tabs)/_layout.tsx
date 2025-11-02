import React from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// expo-router 把底层导航实现在 react-navigation 上
// CustomTabBar 会收到跟 react-navigation TabBarComponent 很类似的 props
type CustomTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
  };
};

function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const router = useRouter();

  const handlePlus = () => {
    // 点黑色 + 号，进入拍照页
    router.push("/camera");
  };

  return (
    <View style={stylesTab.wrapper} pointerEvents="box-none">
      {/* 白色底部栏 */}
      <View style={stylesTab.bar}>
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;

          // 文案
          let label = route.name;
          if (label === "home") label = "Home";
          if (label === "progress") label = "Progress";
          if (label === "settings") label = "Settings";

          // 图标
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "home") iconName = "home";
          if (route.name === "progress") iconName = "trending-up-outline";
          if (route.name === "settings") iconName = "settings-outline";

          return (
            <TouchableOpacity
              key={route.key}
              style={stylesTab.tabItem}
              onPress={() => {
                navigation.navigate(route.name);
              }}
            >
              <Ionicons
                name={iconName}
                size={28}
                color={focused ? "#000" : "#1f2937"}
              />
              <Text
                style={[
                  stylesTab.tabLabel,
                  focused && stylesTab.tabLabelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 悬浮的黑色 + 号按钮 */}
      <TouchableOpacity style={stylesTab.fab} onPress={handlePlus}>
        <Text style={stylesTab.fabPlus}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // 隐藏系统默认TabBar
      }}
      // 自己的tabBar替换默认的
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const stylesTab = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },
  bar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "flex-start", // 保留：三个按钮往左对齐
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    width: "100%",
    paddingTop: 12,
    paddingBottom: 24,
    paddingLeft: 20, // 保留：左边距
    gap: 40, // 保留：按钮间距
  },
  tabItem: {
    alignItems: "center",
    minWidth: 70, // 保留：固定宽度，避免被加号遮挡
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 4,
  },
  tabLabelActive: {
    color: "#000",
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 36,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 15 },
    elevation: 10,
  },
  fabPlus: {
    fontSize: 40,
    fontWeight: "400",
    color: "#fff",
    lineHeight: 44,
  },
});
