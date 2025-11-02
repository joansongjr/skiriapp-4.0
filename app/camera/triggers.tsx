// app/camera/triggers.tsx
// Purpose: After Analysis, let users manually enter dietary/irritant triggers as tags.
// - Smaller "dialog" card at top (can show auto text or last AI hint)
// - Auto-suggest tags from input using simple keyword extraction
// - Tap chips to select; input to create; long-press chip to toggle Good/Bad
// - Persists tag library across days (AsyncStorage)
// - Saves today's selection by date for Home (Day1/Day2…) to read later

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PRESET_TAGS } from "@/lib/tags/constants";
import { loadTagLibrary, saveTagLibrary, loadDayRecords, saveDayRecords, dedupeByLabel, dateKey, type TagItem } from "@/lib/tags/store";

// -------------------- THEME --------------------
const theme = {
  bg: "#F6F7F8",
  card: "#FFFFFF",
  border: "#E6E9ED",
  text: "#11181C",
  subtext: "#6B7280",
  mint: "#B9F6E7", // light mint fill for good/neutral
  mintDeep: "#74F0C0", // CTA mint
  redFill: "#FFD1D1",
  redStroke: "#FF4D4D",
  radius: 18,
};

// -------------------- HELPERS --------------------
// split input into candidate tags (commas / spaces / punctuation)
function extractCandidates(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/\n/g, " ")
    .split(/[,/|;·•・•\-\u3001\uFF0C\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
  // de-dupe while keeping order
  return Array.from(new Set(raw));
}

// -------------------- CHIP --------------------
function TagChip({ item, selected, onPress }: { item: TagItem; selected?: boolean; onPress?: () => void; }) {
  const base: any = {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.redStroke,
    backgroundColor: theme.redFill,
    opacity: selected ? 0.85 : 1,
  };
  return (
    <Pressable onPress={onPress} style={base} hitSlop={8}>
      <Text style={{ fontWeight: "600", color: "#8B1A1A" }}>{item.label}</Text>
    </Pressable>
  );
}

// -------------------- SCREEN --------------------
export default function TriggerTagsScreen() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [library, setLibrary] = useState<TagItem[]>([]);            // all historical tags
  const [selected, setSelected] = useState<TagItem[]>([]);          // today's selection
  const [suggested, setSuggested] = useState<TagItem[]>([]);        // extracted from input

  // load library & preload today's record
  useEffect(() => {
    (async () => {
      const lib = await loadTagLibrary();
      setLibrary(lib);
      const rec = await loadDayRecords();
      const todays = rec[dateKey()] || [];
      if (todays.length) setSelected(todays);
    })();
  }, []);

  // update suggestions whenever input changes
  useEffect(() => {
    const cands = extractCandidates(input).slice(0, 12);
    const items: TagItem[] = cands.map(label => ({ label, sentiment: 'bad', source: 'user' as const }));
    setSuggested(items);
  }, [input]);

  const toggleSelect = (item: TagItem) => {
    const exists = selected.find(t => t.label === item.label);
    if (exists) {
      setSelected(prev => prev.filter(t => t.label !== item.label));
    } else {
      // keep sentiment from library if exists
      const fromLib = library.find(t => t.label === item.label);
      const tag = fromLib ?? item;
      setSelected(prev => [...prev, tag]);
    }
  };

  const toggleSentiment = (label: string) => {
    const flip = (x: TagItem): TagItem => ({ ...x, sentiment: x.sentiment === "bad" ? "good" : "bad" });
    setSelected(prev => prev.map(t => t.label === label ? flip(t) : t));
    setLibrary(prev => prev.map(t => t.label === label ? flip(t) : t));
    // Also update preset tags sentiment if toggled
    setSuggested(prev => prev.map(t => t.label === label ? flip(t) : t));
  };

  const addFromInput = () => {
    const cands = extractCandidates(input);
    if (!cands.length) return;

    const newItems: TagItem[] = cands.map(label => ({
      label,
      sentiment: 'bad',
      source: 'user',
    }));

    const mergedLib = dedupeByLabel([...library, ...newItems]); // 只用户库
    setLibrary(mergedLib);

    setSelected(prev => dedupeByLabel([...prev, ...newItems]));
    setInput('');
  };

  const onPickPreset = (p: TagItem) => {
    const item = { ...p, source: 'preset' as const };
    toggleSelect(item);
  };

  const handleSave = async () => {
    await saveTagLibrary(library);           // 只包含用户自建（your triggers）
    const map = await loadDayRecords();
    map[dateKey()] = selected;              // 当日 Selected 包含 user + preset
    await saveDayRecords(map);
    Alert.alert("Saved", "Today's triggers recorded.");
    router.push('/(tabs)/home');             // 回首页
  };

  const removeSelected = (label: string) => setSelected(prev => prev.filter(t => t.label !== label));

  // -------------- UI --------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
          {/* Back */}
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="chevron-back" size={22} color="#111" />
            <Text style={{ marginLeft: 2, fontSize: 16 }}>Back</Text>
          </Pressable>

          {/* 提示文字 */}
          <Text style={{ color: theme.subtext, fontSize: 14, lineHeight: 22, marginBottom: 20, paddingHorizontal: 4 }}>
            Tell us what you ate / used today (e.g., "hot pot, milk tea, ramen, vitamin C"). We'll turn them into tags below.
          </Text>

          {/* Your triggers */}
          {library.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 10, color: theme.text }}>Your triggers</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {library.map(item => (
                  <TagChip key={`lib-${item.label}`} item={item} selected={!!selected.find(s => s.label === item.label)} onPress={() => toggleSelect(item)} />
                ))}
              </View>
            </View>
          )}

          {/* Input */}
          <Text style={{ marginTop: 10, marginBottom: 8, color: theme.text, fontWeight: '600' }}>Type or select your skincare triggers…</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type or paste. Use comma or space to separate."
                placeholderTextColor="#AAB2BD"
                returnKeyType="done"
                onSubmitEditing={addFromInput}
                style={{ fontSize: 16, paddingVertical: 8 }}
              />
            </View>
            <Pressable 
              onPress={addFromInput}
              disabled={!input.trim()}
              style={{ 
                backgroundColor: input.trim() ? theme.mintDeep : '#D1D5DB', 
                borderRadius: 14, 
                paddingHorizontal: 20, 
                paddingVertical: 18,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ fontWeight: '700', color: input.trim() ? '#0b0d0f' : '#6B7280', fontSize: 15 }}>Add</Text>
            </Pressable>
          </View>

          {/* Common triggers */}
          <View style={{ marginBottom: 8, marginTop: 12 }}>
            <Text style={{ color: theme.subtext, marginBottom: 8, fontSize: 13 }}>Common triggers:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {PRESET_TAGS.map(item => (
                <TagChip 
                  key={`preset-${item.label}`} 
                  item={item} 
                  selected={!!selected.find(s => s.label === item.label)} 
                  onPress={() => onPickPreset(item)} 
                />
              ))}
            </View>
          </View>

          {/* Suggested from input */}
          {suggested.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: theme.subtext, marginBottom: 8 }}>Suggestions from your text</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {suggested.map(item => (
                  <TagChip key={`sug-${item.label}`} item={item} selected={!!selected.find(s => s.label === item.label)} onPress={() => toggleSelect(item)} />
                ))}
              </View>
            </View>
          )}

          {/* Selected box */}
          <View style={{ backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 12, marginTop: 6 }}>
            <Text style={{ color: theme.subtext, marginBottom: 8 }}>Selected:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {selected.length === 0 ? (
                <Text style={{ color: theme.subtext }}>None yet</Text>
              ) : (
                selected.map(item => (
                  <Pressable key={`sel-${item.label}`} onPress={() => removeSelected(item.label)} style={{ marginRight: 10, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TagChip item={item} />
                      <View style={{ position: 'absolute', right: -2, top: -6, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: theme.redStroke }}>
                        <Ionicons name="close" size={14} color={theme.redStroke} style={{ padding: 4 }} />
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          {/* Save CTA */}
          <Pressable onPress={handleSave} style={{ marginTop: 18, backgroundColor: theme.mintDeep, borderRadius: 20, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#74F0C0', shadowOpacity: 0.4, shadowRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={20} color="#0b0d0f" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0b0d0f', marginLeft: 8 }}>Save Today's Record</Text>
            </View>
          </Pressable>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

