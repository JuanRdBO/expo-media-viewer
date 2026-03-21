import { MediaViewer, MediaViewerContext } from "expo-media-viewer";
import { StatusBar } from "expo-status-bar";
import { useContext } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const IMAGES = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  url: `https://picsum.photos/seed/${i + 1}/800/800`,
}));

const URLS = IMAGES.map((img) => img.url);
const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const TILE_SIZE = SCREEN_WIDTH / NUM_COLUMNS;

function GridItem({ url, index }: { url: string; index: number }) {
  const { setOpen } = useContext(MediaViewerContext);

  return (
    <Pressable
      onPress={() => setOpen({ open: true, src: url, initialIndex: index })}
    >
      <MediaViewer.Image index={index}>
        <Image source={{ uri: url }} style={styles.image} />
      </MediaViewer.Image>
    </Pressable>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MediaViewer urls={URLS} theme="dark">
        <FlatList
          data={IMAGES}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <GridItem url={item.url} index={index} />
          )}
        />
        <MediaViewer.Popup />
      </MediaViewer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 50,
  },
  image: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
});
