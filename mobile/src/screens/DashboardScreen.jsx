import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import DocumentPicker from "react-native-document-picker";
import ImagePicker    from "react-native-image-picker";
import RNFS           from "react-native-fs";
import { useAuth }    from "../context/AuthContext";
import { subAPI }     from "../utils/api";
import api            from "../utils/api";

const CHUNK_SIZE = 5 * 1024 * 1024;

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [sub,       setSub]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    subAPI.get().then((r) => setSub(r.data.subscription)).catch(() => {});
  }, []);

  const pickVideo = async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.video] });
      return res;
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) Alert.alert("Error", "Could not open file picker");
      return null;
    }
  };

  const pickFacePhoto = async () => {
    return new Promise((resolve) => {
      ImagePicker.launchImageLibrary({ mediaType: "photo" }, (response) => {
        if (response.didCancel || response.error) resolve(null);
        else resolve(response.assets?.[0]);
      });
    });
  };

  const uploadChunked = async (file, sessionId) => {
    const stat  = await RNFS.stat(file.uri.replace("file://", ""));
    const total = Math.ceil(stat.size / CHUNK_SIZE);
    let jobId   = null;

    for (let i = 0; i < total; i++) {
      const start = i * CHUNK_SIZE;
      const form  = new FormData();
      form.append("sessionId",   sessionId);
      form.append("chunkIndex",  String(i));
      form.append("totalChunks", String(total));
      form.append("fileName",    file.name);
      form.append("fileSize",    String(stat.size));
      form.append("isLast",      String(i === total - 1));
      form.append("chunk", {
        uri:  file.uri,
        type: file.type || "video/mp4",
        name: `chunk_${i}`,
      });

      const r = await api.default.post("/upload/chunk", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const overall = ((i + e.loaded / e.total) / total) * 100;
          setProgress(Math.round(overall));
        },
      });

      if (i === total - 1 && r.data?.jobId) {
        jobId = r.data.jobId;
      }
    }
    return jobId;
  };

  const handleCreate = async () => {
    const videoFile = await pickVideo();
    if (!videoFile) return;

    setUploading(true);
    setStatusMsg("Select a face reference photo (optional)…");

    const facePhoto = await pickFacePhoto();

    setStatusMsg("Uploading video…");
    setProgress(0);

    try {
      const sessionId = `sess_${Date.now()}`;
      const jobId     = await uploadChunked(videoFile, sessionId);

      if (!jobId) { Alert.alert("Error", "Upload failed — no job ID returned"); setUploading(false); return; }

      // Upload face ref if selected
      if (facePhoto) {
        const faceForm = new FormData();
        faceForm.append("face",  { uri: facePhoto.uri, type: facePhoto.type || "image/jpeg", name: "face.jpg" });
        faceForm.append("jobId", jobId);
        await api.default.post("/upload/face", faceForm, { headers: { "Content-Type": "multipart/form-data" } }).catch(() => {});
      }

      setUploading(false);
      navigation.navigate("Processing", { jobId });
    } catch (err) {
      setUploading(false);
      Alert.alert("Error", err?.error || "Upload failed");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout",  style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name?.split(" ")[0]} 👋</Text>
            <Text style={s.planBadge}>{sub?.plan || "Pay Per Use"} Plan</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate("Plans")} style={s.plansBtn}>
              <Text style={s.plansBtnText}>Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={s.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>Create a Reel</Text>
          <Text style={s.heroDesc}>
            Upload any video and let Hessa AI find your best face moments.
          </Text>

          {uploading ? (
            <View style={s.uploadingBlock}>
              <ActivityIndicator color="#a855f7" size="large" style={{ marginBottom: 12 }} />
              <Text style={s.statusMsg}>{statusMsg}</Text>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={s.progressText}>{progress}%</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.uploadBtn} onPress={handleCreate}>
              <Text style={s.uploadBtnText}>🎬  Choose Video</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info cards */}
        <View style={s.infoGrid}>
          {[
            { icon: "🎯", text: "Face detection with >90% confidence" },
            { icon: "✂️", text: "Top 3 moments selected automatically" },
            { icon: "🎵", text: "Beat-synced background music" },
            { icon: "🔒", text: "Auto-deleted after download" },
          ].map((item) => (
            <View key={item.text} style={s.infoCard}>
              <Text style={s.infoIcon}>{item.icon}</Text>
              <Text style={s.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#0a0a0f" },
  scroll:        { padding: 20, gap: 16 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:      { fontSize: 20, fontWeight: "700", color: "#f4f4f5" },
  planBadge:     { fontSize: 12, color: "#a855f7", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  plansBtn:      { backgroundColor: "#27272a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  plansBtnText:  { color: "#a855f7", fontSize: 13, fontWeight: "600" },
  logoutText:    { color: "#71717a", fontSize: 13 },

  heroCard: {
    backgroundColor: "#18181b", borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: "#27272a",
  },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#f4f4f5", marginBottom: 6 },
  heroDesc:  { fontSize: 14, color: "#71717a", marginBottom: 20, lineHeight: 20 },

  uploadBtn: {
    backgroundColor: "#9333ea", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  uploadingBlock: { alignItems: "center" },
  statusMsg:      { color: "#a855f7", fontSize: 14, marginBottom: 8 },
  progressBar: {
    height: 6, backgroundColor: "#3f3f46", borderRadius: 3,
    width: "100%", overflow: "hidden", marginBottom: 6,
  },
  progressFill: { height: "100%", backgroundColor: "#9333ea", borderRadius: 3 },
  progressText: { color: "#71717a", fontSize: 12 },

  infoGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCard: {
    backgroundColor: "#18181b", borderRadius: 14, borderWidth: 1,
    borderColor: "#27272a", padding: 14, width: "47.5%",
  },
  infoIcon: { fontSize: 22, marginBottom: 6 },
  infoText: { color: "#a1a1aa", fontSize: 12, lineHeight: 17 },
});
