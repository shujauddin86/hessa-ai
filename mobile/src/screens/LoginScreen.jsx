import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Error", "Please fill all fields"); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert("Login Failed", err?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.logo}>Hessa AI</Text>
        <Text style={s.tagline}>Your moments, perfectly captured</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#71717a"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#71717a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={s.link}>
            <Text style={s.linkText}>No account? Create one →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  inner:     { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logo:      { fontSize: 32, fontWeight: "800", color: "#d946ef", textAlign: "center", marginBottom: 8 },
  tagline:   { fontSize: 14, color: "#71717a", textAlign: "center", marginBottom: 40 },
  form:      { gap: 12 },
  input: {
    backgroundColor: "#18181b", color: "#f4f4f5",
    borderWidth: 1, borderColor: "#3f3f46",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  btn: {
    backgroundColor: "#9333ea", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link:    { alignItems: "center", paddingVertical: 12 },
  linkText: { color: "#a855f7", fontSize: 14 },
});
