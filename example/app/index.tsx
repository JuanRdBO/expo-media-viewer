import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const DEMOS = [
  {
    href: "/feed",
    title: "Feed preview",
    blurb: "Adaptive grid — 1, 2, or 3+ items per post, mixing photos and video.",
  },
  {
    href: "/masonry",
    title: "Circle masonry",
    blurb: "3-column grid grouped by date; the grid follows you as you swipe.",
  },
] as const;

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>expo-media-viewer</Text>
        <Text style={styles.heading}>Demo showcase</Text>
        <Text style={styles.lede}>
          Two patterns lifted from real apps. Tap any card to open the demo.
        </Text>

        {DEMOS.map((demo) => (
          <Link key={demo.href} href={demo.href} asChild>
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <Text style={styles.cardTitle}>{demo.title}</Text>
              <Text style={styles.cardBlurb}>{demo.blurb}</Text>
              <View style={styles.arrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 48 },
  eyebrow: {
    color: "#7a7a7a",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heading: { color: "#fff", fontSize: 34, fontWeight: "700", marginBottom: 8 },
  lede: { color: "#b0b0b0", fontSize: 15, lineHeight: 22, marginBottom: 28 },
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242424",
  },
  cardPressed: { backgroundColor: "#1c1c1c" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 6 },
  cardBlurb: { color: "#9a9a9a", fontSize: 14, lineHeight: 20 },
  arrow: { position: "absolute", right: 20, top: 20 },
  arrowText: { color: "#555", fontSize: 22 },
});
