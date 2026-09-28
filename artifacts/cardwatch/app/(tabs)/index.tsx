import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardWatch } from '@/context/cardwatch-context';
import type { Detection } from '@/context/cardwatch-context';
import { useColors } from '@/hooks/useColors';

// ---------------------------------------------------------------------------
// Live detection card
// ---------------------------------------------------------------------------

function LiveDetectionCard({ detection, colors }: { detection: Detection; colors: ReturnType<typeof useColors> }) {
  const confidencePct = Math.round(detection.confidence * 100);

  const priceLabel = (() => {
    if (detection.rawPrice != null) return `$${detection.rawPrice.toFixed(2)}`;
    return 'Price unavailable';
  })();

  const hasPrice = detection.rawPrice != null;

  return (
    <View style={[styles.detectionCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      {/* Header row */}
      <View style={styles.detectionCardHeader}>
        <View style={[styles.detectionBadge, { backgroundColor: colors.accent }]}>
          <View style={[styles.detectionDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.detectionBadgeText, { color: colors.primary }]}>DETECTED</Text>
        </View>
        <Text style={[styles.confidenceText, { color: colors.mutedForeground }]}>
          {confidencePct}% confidence
        </Text>
      </View>

      {/* Card content */}
      <View style={styles.detectionContent}>
        {/* Thumbnail */}
        <View style={[styles.cardThumb, { backgroundColor: colors.secondary }]}>
          {detection.imageUrl ? (
            <Image
              source={{ uri: detection.imageUrl }}
              style={styles.cardThumbImage}
              contentFit="contain"
              accessibilityLabel={detection.cardName}
            />
          ) : (
            <MaterialCommunityIcons name="cards-outline" size={28} color={colors.mutedForeground} />
          )}
        </View>

        {/* Info */}
        <View style={styles.detectionInfo}>
          <Text style={[styles.detectionCardName, { color: colors.foreground }]} numberOfLines={2}>
            {detection.cardName}
          </Text>
          <Text style={[styles.detectionSetLine, { color: colors.mutedForeground }]} numberOfLines={1}>
            {detection.setName}
            {detection.cardNumber !== '?' ? ` · #${detection.cardNumber}` : ''}
          </Text>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: hasPrice ? colors.primary : colors.mutedForeground }]}>
              {priceLabel}
            </Text>
            {detection.psa9Price != null && (
              <Text style={[styles.priceSubLabel, { color: colors.mutedForeground }]}>
                PSA 9: ${detection.psa9Price.toFixed(2)}
              </Text>
            )}
            {detection.psa10Price != null && (
              <Text style={[styles.priceSubLabel, { color: colors.mutedForeground }]}>
                PSA 10: ${detection.psa10Price.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.detectionCardFooter, { borderTopColor: colors.border }]}>
        <Feather name="clock" size={11} color={colors.mutedForeground} />
        <Text style={[styles.detectionTimestamp, { color: colors.mutedForeground }]}>
          {new Date(detection.detectedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={[styles.detectionSource, { color: colors.mutedForeground }]}>
          via {detection.source}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty detection placeholder
// ---------------------------------------------------------------------------

function EmptyDetection({
  isScanning,
  scannerStatus,
  colors,
}: {
  isScanning: boolean;
  scannerStatus: string | null;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.emptyDetection, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <MaterialCommunityIcons name="cards-playing-outline" size={24} color={colors.mutedForeground} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {isScanning ? 'Waiting for a clear card' : 'No card detected'}
        </Text>
        {scannerStatus ? (
          <Text style={[styles.emptyStatus, { color: colors.mutedForeground }]} numberOfLines={2}>
            {scannerStatus}
          </Text>
        ) : (
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {isScanning
              ? 'Screenshot the Whatnot stream — CardWatch will detect the card automatically.'
              : 'Your next confirmed card will show up here with confidence and pricing.'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Scanner screen
// ---------------------------------------------------------------------------

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isScanning,
    settings,
    startScanning,
    stopScanning,
    hasLoaded,
    liveDetection,
    scannerStatus,
  } = useCardWatch();

  const buttonLabel = isScanning ? 'Stop scanning' : 'Start scanning';
  const statusLabel = isScanning ? 'Scanner active' : 'Scanner offline';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <FlatList
        data={[]}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 18) + 6, paddingBottom: insets.bottom + 112 },
        ]}
        ListHeaderComponent={
          <View>
            {/* Brand header */}
            <View style={styles.topRow}>
              <View>
                <View style={styles.brandLine}>
                  <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>LIVE CARD INTELLIGENCE</Text>
                </View>
                <Text style={[styles.title, { color: colors.foreground }]}>CARDWATCH</Text>
              </View>
              <Pressable
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [styles.iconButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
                accessibilityLabel="Open settings"
                testID="scanner-settings"
              >
                <Feather name="sliders" size={19} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Status pill */}
            <View style={[styles.statusPill, { backgroundColor: isScanning ? colors.accent : colors.muted }]}>
              <View style={[styles.statusDot, { backgroundColor: isScanning ? colors.primary : colors.mutedForeground }]} />
              <Text style={[styles.statusText, { color: isScanning ? colors.accentForeground : colors.mutedForeground }]}>
                {statusLabel.toUpperCase()}
              </Text>
              <Text style={[styles.statusMeta, { color: isScanning ? colors.accentForeground : colors.mutedForeground }]}>
                {isScanning ? `every ${settings.scanInterval}s` : 'ready when you are'}
              </Text>
            </View>

            {/* Scanner panel */}
            <View style={[styles.scannerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SCANNING SESSION</Text>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                    {isScanning ? 'Watching your screen' : 'Ready to watch'}
                  </Text>
                </View>
                <View style={[styles.liveBadge, { backgroundColor: isScanning ? colors.primary : colors.secondary }]}>
                  {isScanning
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Feather name="eye" size={14} color={colors.mutedForeground} />}
                  <Text style={[styles.liveBadgeText, { color: isScanning ? colors.primaryForeground : colors.mutedForeground }]}>
                    {isScanning ? 'LIVE' : 'IDLE'}
                  </Text>
                </View>
              </View>

              <View style={[styles.scanVisual, { borderColor: isScanning ? colors.primary : colors.border }]}>
                <View style={[styles.scanCorner, styles.cornerTopLeft, { borderColor: colors.primary }]} />
                <View style={[styles.scanCorner, styles.cornerTopRight, { borderColor: colors.primary }]} />
                <View style={[styles.scanCorner, styles.cornerBottomLeft, { borderColor: colors.primary }]} />
                <View style={[styles.scanCorner, styles.cornerBottomRight, { borderColor: colors.primary }]} />
                <View style={[styles.scanRing, { borderColor: isScanning ? colors.primary : colors.secondary }]}>
                  <MaterialCommunityIcons
                    name="cards-outline"
                    size={40}
                    color={isScanning ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.scanVisualTitle, { color: colors.foreground }]}>
                  {isScanning ? 'Looking for an individual card' : 'Screen capture is paused'}
                </Text>
                <Text style={[styles.scanVisualBody, { color: colors.mutedForeground }]}>
                  {isScanning
                    ? 'Screenshot the Whatnot stream — CardWatch reads your gallery automatically.'
                    : 'Start a session to analyze the screen you choose.'}
                </Text>
              </View>

              <Pressable
                onPress={isScanning ? stopScanning : startScanning}
                disabled={!hasLoaded}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: isScanning ? colors.secondary : colors.primary,
                    opacity: pressed ? 0.82 : hasLoaded ? 1 : 0.5,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={buttonLabel}
                testID="toggle-scanning"
              >
                <Feather
                  name={isScanning ? 'square' : 'crosshair'}
                  size={18}
                  color={isScanning ? colors.foreground : colors.primaryForeground}
                />
                <Text style={[styles.primaryButtonText, { color: isScanning ? colors.foreground : colors.primaryForeground }]}>
                  {buttonLabel}
                </Text>
              </Pressable>
              <Text style={[styles.captureNote, { color: colors.mutedForeground }]}>
                CardWatch reads screenshots from your gallery. Take a screenshot of the Whatnot stream to trigger a scan.
              </Text>
            </View>

            {/* Current detection section */}
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CURRENT DETECTION</Text>
              <View style={[styles.confidenceChip, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.confidenceChipText, { color: colors.mutedForeground }]}>
                  MIN {settings.minimumConfidence}%
                </Text>
              </View>
            </View>

            {liveDetection ? (
              <LiveDetectionCard detection={liveDetection} colors={colors} />
            ) : (
              <EmptyDetection isScanning={isScanning} scannerStatus={scannerStatus} colors={colors} />
            )}

            {/* Footer */}
            <View style={[styles.footerCard, { borderColor: colors.border }]}>
              <Feather name="shield" size={16} color={colors.primary} />
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                CardWatch analyzes the visible screen only. It never logs into or accesses Whatnot directly.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  brandDot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.25 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: 1.2 },
  iconButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.7 },
  statusMeta: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 'auto' },
  scannerPanel: { borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 28 },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  panelTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 19, marginTop: 5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  liveBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.7 },
  scanVisual: { height: 238, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanCorner: { position: 'absolute', width: 22, height: 22, borderWidth: 2 },
  cornerTopLeft: { top: 13, left: 13, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTopRight: { top: 13, right: 13, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBottomLeft: { bottom: 13, left: 13, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBottomRight: { bottom: 13, right: 13, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanRing: { width: 82, height: 82, borderWidth: 1, borderRadius: 41, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  scanVisualTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 6 },
  scanVisualBody: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', paddingHorizontal: 30, lineHeight: 18 },
  primaryButton: { height: 52, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 14 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  captureNote: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 10, paddingHorizontal: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  confidenceChip: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  confidenceChipText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.6 },

  // Live detection card
  detectionCard: { borderWidth: 1.5, borderRadius: 20, padding: 14, marginBottom: 8 },
  detectionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  detectionDot: { width: 6, height: 6, borderRadius: 3 },
  detectionBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  confidenceText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  detectionContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  cardThumb: { width: 64, height: 88, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  cardThumbImage: { width: '100%', height: '100%' },
  detectionInfo: { flex: 1 },
  detectionCardName: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4, lineHeight: 21 },
  detectionSetLine: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 10 },
  priceRow: { gap: 3 },
  priceLabel: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  priceSubLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  detectionCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  detectionTimestamp: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  detectionSource: { fontFamily: 'Inter_400Regular', fontSize: 10, marginLeft: 'auto' },

  // Empty state
  emptyDetection: { minHeight: 100, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 5 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  emptyStatus: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },

  footerCard: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingTop: 17, marginTop: 24 },
  footerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});
