import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardWatch } from '@/context/cardwatch-context';
import { useColors } from '@/hooks/useColors';

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { detections, clearHistory } = useCardWatch();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <FlatList
        data={detections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) + 8, paddingBottom: insets.bottom + 112 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ARCHIVE</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Detection history</Text>
            </View>
            {detections.length > 0 ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Clear history?', 'This removes all locally saved detections.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: clearHistory },
                  ])
                }
                style={({ pressed }) => [styles.clearButton, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                testID="clear-history"
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="cards-playing-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No confirmed detections</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Start a scanner session and confirmed cards will be saved here automatically.
            </Text>
            <View style={[styles.emptyRule, { backgroundColor: colors.border }]} />
            <View style={styles.emptyMetaRow}>
              <Feather name="database" size={14} color={colors.mutedForeground} />
              <Text style={[styles.emptyMeta, { color: colors.mutedForeground }]}>Stored securely on this device</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.detectionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardThumb, { backgroundColor: colors.secondary }]}>
              <MaterialCommunityIcons name="cards-outline" size={22} color={colors.mutedForeground} />
            </View>
            <View style={styles.detectionCopy}>
              <Text style={[styles.cardName, { color: colors.foreground }]}>{item.cardName}</Text>
              <Text style={[styles.cardSet, { color: colors.mutedForeground }]}>{item.setName} · {item.cardNumber}</Text>
            </View>
            <View style={styles.detectionRight}>
              <Text style={[styles.price, { color: colors.primary }]}>
                {item.detectedPrice ? `$${item.detectedPrice.toFixed(2)}` : '—'}
              </Text>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {new Date(item.detectedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.6 },
  clearButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { flex: 1, minHeight: 330, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 28, marginTop: 40 },
  emptyIcon: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, textAlign: 'center', marginBottom: 9 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 260 },
  emptyRule: { width: '100%', height: 1, marginVertical: 24 },
  emptyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  emptyMeta: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  detectionRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 10 },
  cardThumb: { width: 52, height: 66, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detectionCopy: { flex: 1 },
  cardName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 5 },
  cardSet: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  detectionRight: { alignItems: 'flex-end' },
  price: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 5 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11 },
});