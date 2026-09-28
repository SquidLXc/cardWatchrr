import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardWatch } from '@/context/cardwatch-context';
import { useColors } from '@/hooks/useColors';
import { useTestDiscord } from '@workspace/api-client-react';

const confidenceOptions = [75, 85, 92];
const intervalOptions = [2, 3, 5];

function OptionGroup({
  label,
  values,
  selected,
  suffix,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  suffix: string;
  onSelect: (value: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.optionGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.options}>
        {values.map((value) => {
          const active = value === selected;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              testID={`${label}-${value}`}
            >
              <Text style={[styles.optionText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {value}{suffix}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useCardWatch();
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const testDiscordMutation = useTestDiscord();

  const handleTestDiscord = () => {
    testDiscordMutation.mutate(undefined, {
      onSuccess: (result) => Alert.alert(result.sent ? 'Discord test sent' : 'Discord is not ready', result.message),
      onError: (error) => Alert.alert('Discord test failed', error instanceof Error ? error.message : 'The backend could not be reached.'),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 18) + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 112 }}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>CONTROL CENTER</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Tune how CardWatch watches, identifies, and notifies.</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTIFICATIONS</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}>
              <Feather name="message-circle" size={17} color={colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Discord alerts</Text>
              <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>Notify only when a new card is confidently identified.</Text>
            </View>
            <Switch
              value={settings.discordEnabled}
              onValueChange={(value) => updateSettings({ discordEnabled: value })}
              trackColor={{ false: colors.secondary, true: colors.primary }}
              thumbColor={settings.discordEnabled ? colors.primaryForeground : colors.mutedForeground}
              accessibilityLabel="Toggle Discord alerts"
              testID="discord-toggle"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={handleTestDiscord}
            disabled={testDiscordMutation.isPending}
            style={({ pressed }) => [styles.testButton, { borderColor: colors.border, opacity: pressed || testDiscordMutation.isPending ? 0.55 : 1 }]}
            testID="test-discord"
          >
            <Feather name={testDiscordMutation.isPending ? 'loader' : 'send'} size={15} color={colors.primary} />
            <Text style={[styles.testButtonText, { color: colors.primary }]}>
              {testDiscordMutation.isPending ? 'Testing Discord…' : 'Test Discord notification'}
            </Text>
            <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 25 }]}>DETECTION</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <OptionGroup label="MINIMUM CONFIDENCE" values={confidenceOptions} selected={settings.minimumConfidence} suffix="%" onSelect={(value) => updateSettings({ minimumConfidence: value })} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <OptionGroup label="SCAN INTERVAL" values={intervalOptions} selected={settings.scanInterval} suffix=" sec" onSelect={(value) => updateSettings({ scanInterval: value })} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 25 }]}>CONNECTION</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BACKEND URL</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="link" size={15} color={colors.mutedForeground} />
            <TextInput
              value={backendUrl}
              onChangeText={setBackendUrl}
              onBlur={() => updateSettings({ backendUrl: backendUrl.trim() })}
              placeholder="https://your-backend.example"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.input, { color: colors.foreground }]}
              testID="backend-url"
            />
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Leave blank while using local-only scanning.</Text>
        </View>

        <View style={[styles.versionRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>CARDWATCH MVP</Text>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>ANDROID FOUNDATION</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 25 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 9, maxWidth: 300 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 10 },
  settingsCard: { borderWidth: 1, borderRadius: 20, padding: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  settingCopy: { flex: 1, paddingRight: 8 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 4 },
  settingDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  divider: { height: 1, marginVertical: 15 },
  testButton: { minHeight: 40, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  testButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, flex: 1 },
  optionGroup: {},
  fieldLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, marginBottom: 10 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, borderWidth: 1, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  inputWrap: { height: 45, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  helperText: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 8 },
  versionRow: { borderTopWidth: 1, marginTop: 28, paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between' },
  versionText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
});