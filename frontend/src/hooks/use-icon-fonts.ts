// Icon font loader. Under Expo Go (StoreClient) the Ionicons .ttf is loaded
// from a CDN; native dev/prod builds and web pass an empty map, so useFonts
// resolves immediately via @react-native-vector-icons autolinking.
// ICON_VECTOR_VERSION must match @react-native-vector-icons/ionicons in package.json.
// Usage: const [loaded, error] = useIconFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";

const ICON_VECTOR_VERSION = "14.0.0";

const iconFontMap = (): Record<string, string> => ({
  Ionicons: `https://cdn.jsdelivr.net/npm/@react-native-vector-icons/ionicons@${ICON_VECTOR_VERSION}/fonts/Ionicons.ttf`,
});

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : {},
  );
