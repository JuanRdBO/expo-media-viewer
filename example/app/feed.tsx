import { Image } from "expo-image";
import { MediaViewer } from "expo-media-viewer";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PlayOverlay } from "../src/components/PlayOverlay";
import { type MediaItem, type Memory, MEMORIES } from "../src/data/samples";
import { logMediaViewerVideoError } from "../src/utils/logMediaViewerVideoError";

export default function FeedPreview() {
  return (
    <>
      <Stack.Screen options={{ title: "Feed" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {MEMORIES.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </ScrollView>
    </>
  );
}

function MemoryCard({ memory }: { memory: Memory }) {
  const urls = memory.items.map((i) => i.url);
  const mediaTypes = memory.items.map((i) => i.type);
  const posterUrls = memory.items.map((i) => i.poster ?? "");
  const topTitles = memory.items.map(() => memory.title);
  const topSubtitles = memory.items.map(() => memory.subtitle);
  const bottomTexts = memory.items.map((_, i) => `${i + 1} / ${memory.items.length}`);
  const handleVideoError = logMediaViewerVideoError(`feed:${memory.id}`);

  return (
    <MediaViewer
      urls={urls}
      theme="dark"
      mediaTypes={mediaTypes}
      posterUrls={posterUrls}
      topTitles={topTitles}
      topSubtitles={topSubtitles}
      bottomTexts={bottomTexts}
      onVideoError={handleVideoError}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.author}>joan</Text>
            <Text style={styles.meta}>{memory.subtitle}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{memory.title}</Text>

        <AdaptiveGrid memory={memory} />
      </View>
    </MediaViewer>
  );
}

function AdaptiveGrid({ memory }: { memory: Memory }) {
  const items = memory.items;

  if (items.length === 1) {
    const item = items[0];
    return (
      <MediaViewer.Image index={0} style={{ borderRadius: 16, overflow: "hidden" }}>
        <Image
          source={{ uri: thumbnailUrl(item) }}
          style={{ width: "100%", height: 280, borderRadius: 16 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.url}
          transition={150}
          priority="high"
        />
        {item.type === "video" && <PlayOverlay duration={item.duration} />}
      </MediaViewer.Image>
    );
  }

  if (items.length === 2) {
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {items.map((item, i) => (
          <MediaViewer.Image
            key={item.url}
            index={i}
            style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
          >
            <Image
              source={{ uri: thumbnailUrl(item) }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.url}
              transition={150}
              priority="high"
            />
            {item.type === "video" && <PlayOverlay duration={item.duration} />}
          </MediaViewer.Image>
        ))}
      </View>
    );
  }

  const primary = items[0];
  const rest = items.slice(1, 4);
  const extra = items.length - 4;

  return (
    <View style={{ gap: 4 }}>
      <MediaViewer.Image index={0} style={{ borderRadius: 14, overflow: "hidden" }}>
        <Image
          source={{ uri: thumbnailUrl(primary) }}
          style={{ width: "100%", height: 240, borderRadius: 14 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={primary.url}
          transition={150}
          priority="high"
        />
        {primary.type === "video" && <PlayOverlay duration={primary.duration} />}
      </MediaViewer.Image>

      <View style={{ flexDirection: "row", gap: 4 }}>
        {rest.map((item, i) => {
          const actualIndex = i + 1;
          const isLast = i === rest.length - 1 && extra > 0;
          return (
            <MediaViewer.Image
              key={item.url}
              index={actualIndex}
              style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}
            >
              <Image
                source={{ uri: thumbnailUrl(item) }}
                style={{ width: "100%", height: 110, borderRadius: 10 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.url}
                transition={150}
                priority="high"
              />
              {item.type === "video" && <PlayOverlay duration={item.duration} />}
              {isLast && (
                <View pointerEvents="none" style={styles.extraOverlay}>
                  <Text style={styles.extraText}>+{extra}</Text>
                </View>
              )}
            </MediaViewer.Image>
          );
        })}
      </View>
    </View>
  );
}

function thumbnailUrl(item: MediaItem) {
  return item.poster ?? item.url;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingVertical: 16 },
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
