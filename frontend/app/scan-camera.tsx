// AI scan camera — capture machine display photo & extract Fat/SNF/Density
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/components/Toast";
import { storage } from "@/src/utils/storage";

export default function ScanCamera() {
  const router = useRouter();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanLine]);

  const ensurePerm = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      return r.granted;
    }
    return true;
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.8,
      });
      if (!photo?.uri) return;
      // resize + base64
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      setCaptured(resized.base64 || null);
      await runScan(resized.base64 || "");
    } catch (e: any) {
      toast(e.message || "Capture failed", "error");
    }
  };

  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    try {
      const resized = await ImageManipulator.manipulateAsync(
        r.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      setCaptured(resized.base64 || null);
      await runScan(resized.base64 || "");
    } catch (e: any) {
      toast(e.message || "Failed", "error");
    }
  };

  const runScan = async (b64: string) => {
    if (!b64) return;
    setScanning(true);
    try {
      const r = await api.scanImage(b64);
      if (r.fat == null && r.snf == null) {
        toast("मूल्ये वाचता आली नाहीत. Manual टाका.", "error");
      } else {
        toast("AI ने वाचले! ✅", "success");
      }
      // Hand result back via storage (simple bridge)
      await storage.setItem(
        "scan_result_tmp",
        JSON.stringify({
          fat: r.fat,
          snf: r.snf,
          density: r.density,
          ts: Date.now(),
        }),
      );
      router.back();
    } catch (e: any) {
      toast(e.message || "Scan failed", "error");
    } finally {
      setScanning(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permWrap}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Ionicons name="camera-outline" size={56} color={COLORS.primary} />
        <Text style={styles.permTitle}>Camera permission हवी आहे</Text>
        <Text style={styles.permDesc}>
          मशीन display चा फोटो काढून आपोआप Fat/SNF वाचण्यासाठी
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={async () => {
            const ok = await ensurePerm();
            if (!ok && permission && !permission.canAskAgain) {
              Linking.openSettings();
            }
          }}
          testID="grant-camera-permission"
        >
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permLink} onPress={() => router.back()}>
          <Text style={{ color: COLORS.textMuted }}>← परत जा</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const translateY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <View style={styles.container}>
      {captured ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${captured}` }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      )}

      {/* Overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          testID="scan-close"
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {!captured ? (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY }] }]}
              />
            ) : null}
          </View>
          <Text style={styles.hint}>
            मशीन display ला frame मध्ये ठेवा
          </Text>
        </View>

        {scanning ? (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text style={styles.scanningText}>AI मूल्ये वाचत आहे...</Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={pickFromGallery}
            testID="pick-gallery"
          >
            <Ionicons name="images-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shutter}
            onPress={handleCapture}
            disabled={scanning}
            testID="capture-button"
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <View style={styles.smallBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, padding: SPACING.lg, justifyContent: "space-between" },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
  frameWrap: { alignItems: "center" },
  frame: {
    width: 280,
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: COLORS.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: RADIUS.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: RADIUS.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: RADIUS.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: RADIUS.lg },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  hint: {
    color: "#fff",
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scanningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  scanningText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: SPACING.xl,
  },
  smallBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
  },
  permWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  permDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  permBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    ...SHADOW.fab,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  permLink: { marginTop: SPACING.md, padding: SPACING.sm },
});
