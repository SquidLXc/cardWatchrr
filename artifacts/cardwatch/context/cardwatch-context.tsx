import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  useCreateDetection,
  useGetSettings,
  useListDetections,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getListDetectionsQueryKey,
} from '@workspace/api-client-react';

export type Detection = {
  id: string;
  cardId?: string | null;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl?: string | null;
  detectedPrice?: number | null;
  rawPrice?: number | null;
  psa9Price?: number | null;
  psa10Price?: number | null;
  confidence: number;
  detectedAt: string;
  source: string;
};

export type ScannerSettings = {
  discordEnabled: boolean;
  minimumConfidence: number;
  scanInterval: number;
  duplicateCooldown: number;
  backendUrl: string;
};

type CardWatchContextValue = {
  isScanning: boolean;
  settings: ScannerSettings;
  detections: Detection[];
  hasLoaded: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  updateSettings: (patch: Partial<ScannerSettings>) => void;
  clearHistory: () => void;
  saveDetection: (detection: Detection) => void;
  serverConnected: boolean;
};

const STORAGE_KEYS = {
  settings: '@cardwatch/settings',
  detections: '@cardwatch/detections',
} as const;

const defaultSettings: ScannerSettings = {
  discordEnabled: true,
  minimumConfidence: 85,
  scanInterval: 3,
  duplicateCooldown: 10,
  backendUrl: '',
};

const CardWatchContext = createContext<CardWatchContextValue | null>(null);

export function CardWatchProvider({ children }: { children: React.ReactNode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [settings, setSettings] = useState<ScannerSettings>(defaultSettings);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const remoteDetectionsQuery = useListDetections({
    query: { enabled: Boolean(process.env.EXPO_PUBLIC_DOMAIN), staleTime: 30_000, queryKey: getListDetectionsQueryKey() },
  });
  const remoteSettingsQuery = useGetSettings({
    query: { enabled: Boolean(process.env.EXPO_PUBLIC_DOMAIN), staleTime: 60_000, queryKey: getGetSettingsQueryKey() },
  });
  const createDetectionMutation = useCreateDetection();
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    async function loadState() {
      try {
        const [savedSettings, savedDetections] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.detections),
        ]);
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }
        if (savedDetections) {
          setDetections(JSON.parse(savedDetections));
        }
      } catch {
        // A fresh local state is safer than presenting stale or malformed data.
      } finally {
        setHasLoaded(true);
      }
    }
    void loadState();
  }, []);

  useEffect(() => {
    if (!remoteDetectionsQuery.isSuccess || !remoteDetectionsQuery.data) return;
    setDetections(
      remoteDetectionsQuery.data.map((item) => ({
        ...item,
        imageUrl: item.imageUrl ?? undefined,
      })),
    );
    void AsyncStorage.setItem(STORAGE_KEYS.detections, JSON.stringify(remoteDetectionsQuery.data));
  }, [remoteDetectionsQuery.data, remoteDetectionsQuery.isSuccess]);

  useEffect(() => {
    if (!remoteSettingsQuery.isSuccess || !remoteSettingsQuery.data) return;
    const next = { ...defaultSettings, ...remoteSettingsQuery.data };
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
  }, [remoteSettingsQuery.data, remoteSettingsQuery.isSuccess]);

  const startScanning = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScanning(true);
  };

  const stopScanning = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsScanning(false);
  };

  const updateSettings = (patch: Partial<ScannerSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
      if (Boolean(process.env.EXPO_PUBLIC_DOMAIN)) {
        updateSettingsMutation.mutate({
          data: {
            discordEnabled: next.discordEnabled,
            minimumConfidence: next.minimumConfidence,
            scanInterval: next.scanInterval,
            duplicateCooldown: next.duplicateCooldown,
            backendUrl: next.backendUrl,
          },
        });
      }
      return next;
    });
    void Haptics.selectionAsync();
  };

  const clearHistory = () => {
    setDetections([]);
    void AsyncStorage.removeItem(STORAGE_KEYS.detections);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveDetection = (detection: Detection) => {
    setDetections((current) => {
      const next = [detection, ...current];
      void AsyncStorage.setItem(STORAGE_KEYS.detections, JSON.stringify(next));
      if (Boolean(process.env.EXPO_PUBLIC_DOMAIN)) {
        createDetectionMutation.mutate({
          data: {
            cardId: detection.cardId,
            cardName: detection.cardName,
            setName: detection.setName,
            cardNumber: detection.cardNumber,
            imageUrl: detection.imageUrl,
            detectedPrice: detection.detectedPrice,
            rawPrice: detection.rawPrice,
            psa9Price: detection.psa9Price,
            psa10Price: detection.psa10Price,
            confidence: detection.confidence,
            detectedAt: detection.detectedAt,
            source: detection.source,
          },
        });
      }
      return next;
    });
  };

  const value = useMemo(
    () => ({
      isScanning,
      settings,
      detections,
      hasLoaded,
      startScanning,
      stopScanning,
      updateSettings,
      clearHistory,
      saveDetection,
      serverConnected: remoteDetectionsQuery.isSuccess || remoteSettingsQuery.isSuccess,
    }),
    [
      isScanning,
      settings,
      detections,
      hasLoaded,
      remoteDetectionsQuery.isSuccess,
      remoteSettingsQuery.isSuccess,
    ],
  );

  return <CardWatchContext.Provider value={value}>{children}</CardWatchContext.Provider>;
}

export function useCardWatch() {
  const context = useContext(CardWatchContext);
  if (!context) {
    throw new Error('useCardWatch must be used inside CardWatchProvider');
  }
  return context;
}