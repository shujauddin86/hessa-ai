import React, { useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Linking,
} from "react-native";
import { jobsAPI } from "../utils/api";

export default function PreviewScreen({ navigation, route }) {
  const { jobId, jobData, isDone } = route.params;
  const [selected, setSelected] = useState(() => {
    const clips = JSON.parse(jobData?.clips_data || "[]");
    return clips.map((c) => c.id || c.index);
  });
  const [loading, setLoading] = useState(false);

  const clips = JSON.parse(jobData?.clips_data || "[]");

  const toggleClip = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selected.length === 0) { Alert.alert("Select at least one clip"); return; }
    setLoading(true);
    try {
      await jobsAPI.selectClips(jobId, selected);
      navigation.replace("Processing", { jobId });
    } catch (err) {
      Alert.alert("Error", err?.error || "Failed to start final render");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const r   = await jobsAPI.downloadLink(jobId);
      const url = r.data?.url;
      if (url) Linking.openURL(url);
    } catch (err) {
      Alert.alert("Error", "Download link expired. Please regenerate.");
    }
  };

  if (isDone) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.doneInner}>
          <Text style={s.doneEmoji}>🎉</Text>
          <Text style={s.doneTitle}>Your reel is ready!</Text>
          <Text style={s.doneDesc}>
            Download now. The file is auto-deleted after download.
          </Text>
          <TouchableOpacity style={s.dlBtn} onPress={handleDownload}>
            <Text style={s.dlBtnText}>⬇  Download Reel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate("Dashboard")}>
            <Text style={s.backBtnText}>Create Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Select your clips</Text>
        <Text style={s.subtitle}>Choose which moments to include in your reel</Text>

        {clips.map((clip, i) => {
          const id       = clip.id || clip.index || i;
          const isActive = selected.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[s.clipCard, isActive && s.clipCardActive]}
              onPress={() => toggleClip(id)}
            >
              <View style={s.clipThumb}>
                <Text style={s.clipThumbText}>🎞️</Text>
              </View>
              <View style={s.clipInfo}>
                <Text style={s.clipTitle}>Clip {i + 1}</Text>
                <Text style={s.clipMeta}>
                  {Math.round(clip.duration || 0)}s · {clip.segment?.dominantEmotion || "neutral"}
                  {clip.score ? ` · Score: ${(clip.score * 100).toFixed(0)}%` : ""}
                </Text>
              </View>
              <View style={[s.check, isActive && s.checkActive]}>
                {isActive && <Text style={s.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[s.confirmBtn, (selected.length === 0 || loading) && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={selected.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.confirmBtnText}>
              Generate Reel with {selected.length} clip{selected.length !== 1 ? "s" : ""}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  scroll:    { padding: 20, gap: 12 },
  title:     { fontSize: 22, fontWeight: "700", color: "#f4f4f5" },
  subtitle:  { fontSize: 14, color: "#71717a", marginBottom: 8 },

  clipCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#18181b", borderRadius: 14, borderWidth: 1,
    borderColor: "#27272a", padding: 14,
  },
  clipCardActive: { borderColor: "#9333ea", backgroundColor: "#2e1065" },
  clipThumb: {
    width: 56, height: 56, backgroundColor: "#27272a",
    borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  clipThumbText: { fontSize: 24 },
  clipInfo:  { flex: 1 },
  clipTitle: { color: "#f4f4f5", fontWeight: "600", marginBottom: 2 },
  clipMeta:  { color: "#71717a", fontSize: 12 },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: "#3f3f46", alignItems: "center", justifyContent: "center",
  },
  checkActive: { borderColor: "#9333ea", backgroundColor: "#9333ea" },
  checkMark:   { color: "#fff", fontSize: 12, fontWeight: "700" },

  confirmBtn: {
    backgroundColor: "#9333ea", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText:     { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Done state
  doneInner: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: "800", color: "#f4f4f5", marginBottom: 8 },
  doneDesc:  { fontSize: 14, color: "#71717a", textAlign: "center", marginBottom: 32 },
  dlBtn: {
    backgroundColor: "#9333ea", borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 32, alignItems: "center", marginBottom: 12,
  },
  dlBtnText:   { color: "#fff", fontWeight: "700", fontSize: 16 },
  backBtn:     { paddingVertical: 14 },
  backBtnText: { color: "#71717a", fontSize: 15 },
});
