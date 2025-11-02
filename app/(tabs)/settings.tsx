import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.body}>
          这里放提醒开关、导出数据、账号登录、之类的设置项。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 200,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#000", marginBottom: 12 },
  body: { fontSize: 16, color: "#4b5563", lineHeight: 22 },
});
