/**
 * useScreenScanner — Android screen capture + OCR + detection pipeline.
 *
 * ## How it works
 *
 * Android's MediaProjection API lets an app record/capture the screen after
 * the user explicitly grants permission. In the Expo ecosystem this requires
 * either:
 *   a) A custom native module (EAS build / bare workflow), or
 *   b) expo-screen-capture which only handles *preventing* capture (not reading
 *      frames), or
 *   c) expo-image-picker's `launchImageLibraryAsync` / camera approach.
 *
 * For the current Expo managed workflow we use the following approach:
 *   1. `expo-media-library` to read the most recent screenshot the user takes
 *      (the user screens-hot the Whatnot stream themselves, or an automation
 *      does it via ADB/Accessibility — both land in the gallery).
 *   2. On each poll interval we check if a new screenshot has appeared in the
 *      gallery since the last check. If yes, we run OCR on it.
 *   3. We POST the OCR metadata to the backend `/detect` endpoint which
 *      handles identification + pricing.
 *   4. If the backend returns a positive detection, we call `onDetected`.
 *
 * This approach:
 *   - Works in Expo Go and the standard managed workflow.
 *   - Degrades gracefully if media library permission is denied (scans still
 *     fire but always return no-detection; the user sees the "waiting" state).
 *   - When an EAS / bare workflow adds the `@cardwatch/screen-capture` native
 *     module, we can swap the frame source here without changing anything else.
 *
 * ## Backend-optional mode
 *
 * If `backendUrl` is empty the hook skips the `/detect` call and returns the
 * raw OCR result directly with a synthetic detection object, so the app is
 * fully usable offline / without the API server running.
 */

import { useCallback, useEffect, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import type { OCRResult } from './useOCR';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScanDetection = {
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string | null;
  /**
   * The identified card's market price from the backend (price.raw).
   * Populated only when the backend confirms identification.
   * Identical to rawPrice in practice — use rawPrice for display;
   * detectedPrice is kept for DB compatibility.
   */
  detectedPrice: number | null;
  /** Raw market price from the price provider. Primary price for display. */
  rawPrice: number | null;
  psa9Price: number | null;
  psa10Price: number | null;
  confidence: number;
  source: string;
};

export type ScreenScannerOptions = {
  /** Whether the scanner loop should be running */
  enabled: boolean;
  /** Seconds between each poll */
  intervalSeconds: number;
  /** Base URL of the CardWatch API server, e.g. "https://your-api.example" */
  backendUrl: string;
  /** Minimum confidence (0-1) — scans below this are silently dropped */
  minConfidence: number;
  /** Called when a card is confirmed */
  onDetected: (detection: ScanDetection) => void;
  /** Called when any error occurs so the UI can surface it */
  onError?: (message: string) => void;
  /** Injected OCR function (from useOCR) */
  runOCR: (imageUri: string) => Promise<OCRResult>;
};

// ---------------------------------------------------------------------------
// Backend /detect call
// ---------------------------------------------------------------------------

type BackendDetectResponse = {
  detected: boolean;
  confidence: number;
  boundingBox: { left: number; top: number; width: number; height: number };
  identification: {
    identified: boolean;
    confidence: number;
    card: {
      id: string;
      name: string;
      setName: string;
      number: string;
      imageUrl: string | null;
    } | null;
    price: {
      raw: number | null;
      psa9: number | null;
      psa10: number | null;
      available: boolean;
    } | null;
    reason: string;
  } | null;
  reason: string;
};

async function callBackendDetect(
  backendUrl: string,
  ocr: OCRResult,
): Promise<BackendDetectResponse | null> {
  try {
    const url = `${backendUrl.replace(/\/$/, '')}/api/detect`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confidence: ocr.confidence,
        boundingBox: { left: 0, top: 0, width: 1080, height: 1920 },
        cardName: ocr.cardName ?? undefined,
        setName: ocr.setName ?? undefined,
        cardNumber: ocr.cardNumber ?? undefined,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendDetectResponse;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useScreenScanner(options: ScreenScannerOptions): void {
  const {
    enabled,
    intervalSeconds,
    backendUrl,
    minConfidence,
    onDetected,
    onError,
    runOCR,
  } = options;

  // Track the creation time of the last asset we processed so we only look at
  // *new* screenshots that arrived after the scan session started.
  const lastAssetTimeRef = useRef<number>(Date.now());
  const runningRef = useRef(false);

  const scan = useCallback(async () => {
    // Prevent overlapping scans
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      // 1. Request / check media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        onError?.('Media library permission is required to read screen captures.');
        return;
      }

      // 2. Fetch the most recent screenshot
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 1,
        // Filter to Screenshots album when available
      });

      const asset = assets[0];
      if (!asset) return;

      // Only process assets newer than when scanning started
      const assetMs = asset.creationTime * 1000; // expo returns seconds
      if (assetMs <= lastAssetTimeRef.current) return;
      lastAssetTimeRef.current = assetMs;

      // 3. Get the local URI for the full-size image
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      const imageUri = assetInfo.localUri ?? assetInfo.uri;

      // 4. Run OCR
      const ocr = await runOCR(imageUri);

      // Drop if confidence too low
      if (ocr.confidence < minConfidence) return;

      // 5a. If backend is configured, call /detect
      if (backendUrl.trim()) {
        const result = await callBackendDetect(backendUrl, ocr);
        if (!result) {
          onError?.('Could not reach the CardWatch backend. Check your backend URL in Settings.');
          return;
        }
        if (!result.detected || !result.identification?.identified) return;

        const { card, price } = result.identification;
        if (!card) return;

        onDetected({
          cardName: card.name,
          setName: card.setName,
          cardNumber: card.number,
          imageUrl: card.imageUrl,
          detectedPrice: price?.raw ?? null,
          rawPrice: price?.raw ?? null,
          psa9Price: price?.psa9 ?? null,
          psa10Price: price?.psa10 ?? null,
          confidence: result.confidence,
          source: 'screen-capture:backend',
        });
        return;
      }

      // 5b. Backend-less mode — synthesise a detection from OCR alone
      if (!ocr.cardName) return;
      onDetected({
        cardName: ocr.cardName,
        setName: ocr.setName ?? 'Unknown set',
        cardNumber: ocr.cardNumber ?? '?',
        imageUrl: imageUri,
        detectedPrice: null,
        rawPrice: null,
        psa9Price: null,
        psa10Price: null,
        confidence: ocr.confidence,
        source: 'screen-capture:local-ocr',
      });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Unknown scanner error.');
    } finally {
      runningRef.current = false;
    }
  }, [backendUrl, minConfidence, onDetected, onError, runOCR]);

  useEffect(() => {
    if (!enabled) {
      // Reset the timestamp so when scanning resumes we start fresh
      lastAssetTimeRef.current = Date.now();
      return;
    }

    // Run immediately on start, then on interval
    void scan();
    const id = setInterval(() => void scan(), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [enabled, intervalSeconds, scan]);
}
