import { MediaViewer, type MediaViewerItem, type MediaViewerRenderItem } from "expo-media-viewer";
import { router, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MEMORIES, type Memory } from "../src/data/samples";
import { logMediaViewerVideoError } from "../src/utils/logMediaViewerVideoError";

export default function FeedPreview() {
  return (
    <>
      <Stack.Screen options={{ title: "Feed" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="Feed" />
        {MEMORIES.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </ScrollView>
    </>
  );
}

function MemoryCard({ memory }: { memory: Memory }) {
  const items = memory.items.map((item, index) => ({
    ...item,
    chrome: {
      title: memory.title,
      subtitle: memory.subtitle,
      footer: `${index + 1} / ${memory.items.length}`,
    },
  }));
  const handleVideoError = logMediaViewerVideoError(`feed:${memory.id}`);

  return (
    <MediaViewer
      items={items}
      config={{
        theme: "dark",
        thumbnail: { mode: "loop-muted", fit: "cover" },
      }}
      onVideoError={handleVideoError}
      renderLayout={({ items, renderItem }) => (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.author}>joan</Text>
              <Text style={styles.meta}>{memory.subtitle}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{memory.title}</Text>

          <AdaptiveGrid items={items} renderItem={renderItem} />
        </View>
      )}
    />
  );
}

function AdaptiveGrid({
  items,
  renderItem,
}: {
  items: MediaViewerItem[];
  renderItem: MediaViewerRenderItem;
}) {
  if (items.length === 1) {
    return renderItem(0, {
      frame: { width: "100%", height: 280, borderRadius: 16 },
    });
  }

  if (items.length === 2) {
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {items.map((_item, index) =>
          renderItem(index, {
            frame: { flex: 1, height: 200, borderRadius: 12 },
          }),
        )}
      </View>
    );
  }

  const rest = items.slice(1, 4);
  const extra = items.length - 4;

  return (
    <View style={{ gap: 4 }}>
      {renderItem(0, {
        frame: { width: "100%", height: 240, borderRadius: 14 },
      })}

      <View style={{ flexDirection: "row", gap: 4 }}>
        {rest.map((_item, index) => {
          const actualIndex = index + 1;
          const isLast = index === rest.length - 1 && extra > 0;
          return renderItem(actualIndex, {
            frame: { flex: 1, height: 110, borderRadius: 10 },
            overlay: isLast ? (
              <View pointerEvents="none" style={styles.extraOverlay}>
                <Text style={styles.extraText}>+{extra}</Text>
              </View>
            ) : null,
          });
        })}
      </View>
    </View>
  );
}

function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      <Text style={styles.screenTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingTop: 12, paddingBottom: 16 },
  screenHeader: {
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { color: "#fff", fontSize: 34, lineHeight: 38 },
  screenTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "600", textAlign: "center" },
  headerSpacer: { width: 40 },
  card: {
    backgroundColor: "#121212",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2a2a2a",
    marginRight: 10,
  },
  author: { color: "#fff", fontSize: 14, fontWeight: "600" },
  meta: { color: "#7e7e7e", fontSize: 12, marginTop: 1 },
  cardTitle: { color: "#e8e8e8", fontSize: 16, marginBottom: 12 },
  extraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: { color: "#fff", fontSize: 22, fontWeight: "700" },
});
