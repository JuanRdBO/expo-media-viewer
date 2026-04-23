import { Image, type ImageStyle } from "expo-image";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View } from "react-native";
import { CIRCLE_SECTIONS, MEMORIES } from "../src/data/samples";

type DemoCard = {
  href: "/feed" | "/masonry";
  eyebrow: string;
  title: string;
  blurb: string;
  preview: "feed" | "masonry";
};

const DEMOS: DemoCard[] = [
  {
    href: "/feed",
    eyebrow: "Pattern 01",
    title: "Feed preview",
    blurb: "Adaptive grid — 1, 2, or 3+ items per post, mixing photos and video.",
    preview: "feed",
  },
  {
    href: "/masonry",
    eyebrow: "Pattern 02",
    title: "Circle masonry",
    blurb: "3-column grid grouped by date; the grid follows you as you swipe.",
    preview: "masonry",
  },
];

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>expo-media-viewer</Text>
        <Text style={styles.heading}>Demo showcase</Text>
        <Text style={styles.lede}>
          Two patterns lifted from real apps. Tap any card to open the demo.
        </Text>

        <View style={styles.cards}>
          {DEMOS.map((demo) => (
            <Link key={demo.href} href={demo.href} asChild>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={styles.preview}>
                  {demo.preview === "feed" ? <FeedPreview /> : <MasonryPreview />}
                </View>
                <View style={styles.meta}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardEyebrow}>{demo.eyebrow}</Text>
                    <Text style={styles.cardTitle}>{demo.title}</Text>
                    <Text style={styles.cardBlurb}>{demo.blurb}</Text>
                  </View>
                  <View style={styles.chevron}>
                    <Text style={styles.chevronGlyph}>→</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function FeedPreview() {
  const items = MEMORIES[0].items.slice(0, 3);
  const [hero, ...rest] = items;
  return (
    <View style={styles.feedPreview}>
      <Thumb uri={hero.url} style={styles.feedHero} />
      <View style={styles.feedSide}>
        {rest.map((item) => (
          <Thumb key={item.url} uri={item.url} style={styles.feedSmall} />
        ))}
      </View>
    </View>
  );
}

function MasonryPreview() {
  const items = CIRCLE_SECTIONS[0].items.slice(0, 9);
  const rows = [items.slice(0, 3), items.slice(3, 6), items.slice(6, 9)];
  return (
    <View style={styles.masonryPreview}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.masonryRow}>
          {row.map((item, ci) => {
            const corner =
              ri === 0 && ci === 0
                ? styles.masonryCornerTL
                : ri === 0 && ci === row.length - 1
                  ? styles.masonryCornerTR
                  : null;
            return (
              <Thumb
                key={`${item.url}-${ri}-${ci}`}
                uri={item.poster ?? item.url}
                style={[styles.masonryCell, corner]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Thumb({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={{ uri }}
      style={[styles.thumb, style]}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
    />
  );
}

const BG = "#0a0a0a";
const CARD_BG = "#141414";
const CARD_BORDER = "#2a2a2a";
const PREVIEW_BG = "#1b1b1b";
const GAP = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 48 },
  eyebrow: {
    color: "#7a7a7a",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heading: { color: "#fff", fontSize: 34, fontWeight: "700", marginBottom: 10 },
  lede: { color: "#9e9e9e", fontSize: 15, lineHeight: 22, marginBottom: 28 },

  cards: { gap: 16 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },

  preview: {
    height: 180,
    backgroundColor: PREVIEW_BG,
    padding: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  feedPreview: {
    flex: 1,
    flexDirection: "row",
    gap: GAP * 3,
  },
  feedHero: { flex: 2 },
  feedSide: { flex: 1, gap: GAP * 3 },
  feedSmall: { flex: 1 },

  masonryPreview: {
    flex: 1,
    gap: GAP,
  },
  masonryRow: {
    flex: 1,
    flexDirection: "row",
    gap: GAP,
  },
  masonryCell: { flex: 1, borderRadius: 0 },
  masonryCornerTL: { borderTopLeftRadius: 14 },
  masonryCornerTR: { borderTopRightRadius: 14 },

  thumb: {
    backgroundColor: "#222",
    borderRadius: 14,
    overflow: "hidden",
  },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  cardEyebrow: {
    color: "#6a6a6a",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 4 },
  cardBlurb: { color: "#9a9a9a", fontSize: 13, lineHeight: 18 },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronGlyph: { color: "#d0d0d0", fontSize: 16 },
});
