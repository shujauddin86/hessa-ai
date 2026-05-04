import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form,    setForm]    = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert("Error", "Please fill all fields"); return;
    }
    if (form.password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters"); return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email.trim().toLowerCase(), form.password);
    } catch (err) {
      Alert.alert("Registration Failed", err?.error || "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.logo}>Hessa AI</Text>
        <Text style={s.tagline}>Create your account — free to start</Text>

        <View style={s.form}>
          {[
            { key: "name",     placeholder: "Your name",       secure: false, keyboard: "default" },
            { key: "email",    placeholder: "Email",           secure: false, keyboard: "email-address" },
            { key: "password", placeholder: "Password (8+)",   secure: true,  keyboard: "default" },
          ].map(({ key, placeholder, secure, keyboard }) => (
            <TextInput
              key={key}
              style={s.input}
              placeholder={placeholder}
              placeholderTextColor="#71717a"
              value={form[key]}
              onChangeText={(v) => update(key, v)}
              secureTextEntry={secure}
              keyboardType={keyboard}
              autoCapitalize={key === "name" ? "words" : "none"}
            />
          ))}

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={s.link}>
            <Text style={s.linkText}>Already have an account? Sign in →</Text>
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
  btnText:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  link:     { alignItems: "center", paddingVertical: 12 },
  linkText: { color: "#a855f7", fontSize: 14 },
});
