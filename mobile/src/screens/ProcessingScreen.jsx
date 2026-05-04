import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:4000";

const STAGE_LABELS = {
  normalizing:         "Preparing video…",
  extracting_frames:   "Extracting frames…",
  detecting_faces:     "Detecting faces…",
  tracking_face:       "Tracking identity…",
  grouping_timestamps: "Grouping moments…",
  generating_clips:    "Generating clips…",
  scoring_moments:     "Scoring moments…",
  selecting_clips:     "Selecting top clips…",
  building_story:      "Building story…",
  music_sync:          "Syncing music…",
  editing:             "Editing…",
  rendering:           "Rendering…",
  validating:          "Validating…",
  preview_ready:       "Preview ready!",
  done:                "Done!",
};

export default function ProcessingScreen({ navigation, route }) {
  const { jobId } = route.params;
  const [progress, setProgress] = useState(0);
  const [stage,    setStage]    = useState("starting");
  const [status,   setStatus]   = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    let retries = 0;

    const connect = async () => {
      const token = await AsyncStorage.getItem("hessa_token");
      const url   = `${API_URL}/api/jobs/${jobId}/stream-progress?token=${encodeURIComponent(token || "")}`;

      // React Native doesn't have native EventSource — use polling fallback
      const poll = async () => {
        try {
          const r    = await fetch(`${API_URL}/api/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await r.json();

          setProgress(data.progress || 0);
          setStage(data.stage || "processing");
          setStatus(data.status);

          if (data.status === "preview_ready") {
            navigation.replace("Preview", { jobId, jobData: data });
            return;
          }
          if (data.status === "done") {
            navigation.replace("Preview", { jobId, jobData: data, isDone: true });
            return;
          }
          if (data.status === "failed") {
            Alert.alert("Processing Failed", data.error || "Something went wrong");
            navigation.goBack();
            return;
          }
          if (data.status === "face_required") {
            Alert.alert("Face Not Detected", data.error || "Please try with a clearer photo");
            navigation.goBack();
            return;
          }

          // Continue polling
          setTimeout(poll, 2000);
        } catch (err) {
          retries++;
          if (retries < 10) setTimeout(poll, 3000);
        }
      };

      poll();
    };

    connect();
    return () => { /* cleanup handled by retries check */ };
  }, [jobId]);

  const stageLabel = STAGE_LABELS[stage] || stage;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <ActivityIndicator color="#a855f7" size="large" style={{ marginBottom: 32 }} />

        <Text style={s.title}>AI is working…</Text>
        <Text style={s.stageLabel}>{stageLabel}</Text>

        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressText}>{progress}%</Text>

        <Text style={s.hint}>This may take a few minutes for longer videos.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  inner:     { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  title:     { fontSize: 22, fontWeight: "700", color: "#f4f4f5", marginBottom: 8 },
  stageLabel:{ fontSize: 14, color: "#a855f7", marginBottom: 24 },
  progressBar: {
    height: 6, backgroundColor: "#27272a", borderRadius: 3,
    width: "100%", overflow: "hidden", marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#9333ea", borderRadius: 3 },
  progressText:  { color: "#71717a", fontSize: 12, marginBottom: 32 },
  hint:          { color: "#52525b", fontSize: 12, textAlign: "center" },
});
