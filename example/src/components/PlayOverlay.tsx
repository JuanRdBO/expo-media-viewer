import { StyleSheet, Text, View } from "react-native";

export function PlayOverlay({ duration }: { duration?: string }) {
  return (
    <View pointerEvents="none" style={styles.badge}>
      <Text style={styles.glyph}>▶</Text>
      {duration ? <Text style={styles.duration}>{duration}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  glyph: { color: "#fff", fontSize: 14, marginLeft: 2 },
  duration: { color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 6 },
});
