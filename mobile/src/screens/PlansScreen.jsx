import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { subAPI } from "../utils/api";

const PLANS = [
  {
    id: "PAY_PER_USE",
    name: "Pay Per Use",
    price: "₹99",
    period: "/reel",
    features: [
      "Pay only for what you create",
      "1080p output",
      "No watermark",
      "Beat-synced music",
      "Cinematic LUT color grading",
      "AWS face detection",
    ],
    highlight: false,
  },
  {
    id: "ADVANCED",
    name: "Advanced",
    price: "₹299",
    period: "/month",
    features: [
      "3 reels per day",
      "1080p output",
      "Priority processing",
      "No watermark",
      "Two-pass motion stabilization",
      "AWS face detection",
    ],
    highlight: true,
  },
  {
    id: "PRIVACY",
    name: "Privacy",
    price: "₹199",
    period: "/month",
    features: [
      "Unlimited face analysis",
      "No reel output",
      "Platform violation detection",
      "Takedown request generator",
      "Zero storage policy",
    ],
    highlight: false,
  },
];

export default function PlansScreen() {
  const [sub,     setSub]     = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    subAPI.get().then((r) => setSub(r.data.subscription)).catch(() => {});
  }, []);

  const handleSelect = async (plan) => {
    if (plan.id === sub?.plan) return;

    setLoading(plan.id);
    try {
      const initRes = await subAPI.pay({ plan: plan.id });
      // Simulate payment (replace with Razorpay React Native SDK)
      await new Promise((r) => setTimeout(r, 1500));
      await subAPI.confirm({
        plan:      plan.id,
        paymentId: initRes.data.paymentIntentId,
        amount:    initRes.data.amount,
      });
      setSub({ plan: plan.id, status: "active" });
      Alert.alert("Success!", `You're now on the ${plan.name} plan.`);
    } catch (err) {
      Alert.alert("Payment Failed", err?.error || "Please try again");
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Choose your plan</Text>
        {sub?.plan && <Text style={s.current}>Current: {sub.plan}</Text>}

        {PLANS.map((plan) => {
          const isCurrent = sub?.plan === plan.id;
          const isLoading = loading === plan.id;

          return (
            <View
              key={plan.id}
              style={[s.card, plan.highlight && s.cardHighlight, isCurrent && s.cardCurrent]}
            >
              {plan.highlight && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>Most Popular</Text>
                </View>
              )}

              <View style={s.cardHeader}>
                <Text style={s.planName}>{plan.name}</Text>
                <View style={s.priceRow}>
                  <Text style={s.price}>{plan.price}</Text>
                  <Text style={s.period}>{plan.period}</Text>
                </View>
              </View>

              {plan.features.map((f) => (
                <Text key={f} style={s.feature}>✓  {f}</Text>
              ))}

              <TouchableOpacity
                style={[s.btn, isCurrent && s.btnDisabled, plan.highlight && !isCurrent && s.btnHighlight]}
                onPress={() => handleSelect(plan)}
                disabled={isCurrent || !!loading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnText}>
                    {isCurrent ? "✓ Current Plan" : `Select ${plan.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0f" },
  scroll:    { padding: 20, gap: 14 },
  title:     { fontSize: 24, fontWeight: "800", color: "#f4f4f5", marginBottom: 4 },
  current:   { color: "#a855f7", fontSize: 13, marginBottom: 12 },

  card: {
    backgroundColor: "#18181b", borderRadius: 18, borderWidth: 1,
    borderColor: "#27272a", padding: 18,
  },
  cardHighlight: { borderColor: "#9333ea", backgroundColor: "#1e0a36" },
  cardCurrent:   { borderColor: "#22c55e" },

  badge:     { alignSelf: "flex-start", backgroundColor: "#4c1d95", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  badgeText: { color: "#d8b4fe", fontSize: 11, fontWeight: "600" },

  cardHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  planName:    { fontSize: 18, fontWeight: "700", color: "#f4f4f5" },
  priceRow:    { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price:       { fontSize: 22, fontWeight: "800", color: "#f4f4f5" },
  period:      { fontSize: 12, color: "#71717a" },

  feature:  { color: "#a1a1aa", fontSize: 13, marginBottom: 5 },
  btn: {
    backgroundColor: "#27272a", borderRadius: 12,
    paddingVertical: 13, alignItems: "center", marginTop: 14,
  },
  btnHighlight: { backgroundColor: "#9333ea" },
  btnDisabled:  { backgroundColor: "#1a1a1a" },
  btnText:      { color: "#fff", fontWeight: "700", fontSize: 14 },
});
