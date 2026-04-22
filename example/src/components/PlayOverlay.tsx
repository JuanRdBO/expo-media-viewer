import { StyleSheet, Text, View } from "react-native";

export function PlayOverlay() {
  return (
    <View pointerEvents="none" style={styles.badge}>
      <Text style={styles.glyph}>▶</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { color: "#fff", fontSize: 14, marginLeft: 2 },
});
