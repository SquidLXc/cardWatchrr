import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { useColors } from '@/hooks/useColors';

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isScanning, settings, startScanning, stopScanning, hasLoaded } = useCardWatch();

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

            <View style={[styles.statusPill, { backgroundColor: isScanning ? colors.accent : colors.muted }]}>
              <View style={[styles.statusDot, { backgroundColor: isScanning ? colors.primary : colors.mutedForeground }]} />
              <Text style={[styles.statusText, { color: isScanning ? colors.accentForeground : colors.mutedForeground }]}>
                {statusLabel.toUpperCase()}
              </Text>
              <Text style={[styles.statusMeta, { color: isScanning ? colors.accentForeground : colors.mutedForeground }]}>
                {isScanning ? `every ${settings.scanInterval}s` : 'ready when you are'}
              </Text>
            </View>

            <View style={[styles.scannerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SCANNING SESSION</Text>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                    {isScanning ? 'Watching your screen' : 'Ready to watch'}
                  </Text>
                </View>
                <View style={[styles.liveBadge, { backgroundColor: isScanning ? colors.primary : colors.secondary }]}>
                  {isScanning ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name="eye" size={14} color={colors.mutedForeground} />}
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
                  <MaterialCommunityIcons name="cards-outline" size={40} color={isScanning ? colors.primary : colors.mutedForeground} />
                </View>
                <Text style={[styles.scanVisualTitle, { color: colors.foreground }]}>
                  {isScanning ? 'Looking for an individual card' : 'Screen capture is paused'}
                </Text>
                <Text style={[styles.scanVisualBody, { color: colors.mutedForeground }]}>
                  {isScanning
                    ? 'Only clear card candidates move to identification.'
                    : 'Start a session to analyze the screen you choose.'}
                </Text>
              </View>

              <Pressable
                onPress={isScanning ? stopScanning : startScanning}
                disabled={!hasLoaded}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: isScanning ? colors.secondary : colors.primary, opacity: pressed ? 0.82 : hasLoaded ? 1 : 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={buttonLabel}
                testID="toggle-scanning"
              >
                <Feather name={isScanning ? 'square' : 'crosshair'} size={18} color={isScanning ? colors.foreground : colors.primaryForeground} />
                <Text style={[styles.primaryButtonText, { color: isScanning ? colors.foreground : colors.primaryForeground }]}>
                  {buttonLabel}
                </Text>
              </Pressable>
              <Text style={[styles.captureNote, { color: colors.mutedForeground }]}>
                Android screen capture permission is requested when the capture service is connected.
              </Text>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CURRENT DETECTION</Text>
              <View style={[styles.confidenceChip, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.confidenceChipText, { color: colors.mutedForeground }]}>MIN {settings.minimumConfidence}%</Text>
              </View>
            </View>
            <View style={[styles.emptyDetection, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <MaterialCommunityIcons name="cards-playing-outline" size={24} color={colors.mutedForeground} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {isScanning ? 'Waiting for a clear card' : 'No card detected'}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                  {isScanning
                    ? 'Keep the card centered and in view. Confirmed cards will appear here.'
                    : 'Your next confirmed card will show up here with confidence and pricing.'}
                </Text>
              </View>
            </View>

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
  emptyDetection: { minHeight: 100, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 5 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  footerCard: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingTop: 17, marginTop: 24 },
  footerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});