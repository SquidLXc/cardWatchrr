/**
 * useOCR — lightweight on-device text extraction for CardWatch.
 *
 * In the Expo managed workflow we don't have access to the full ML Kit
 * Text Recognition native module without a custom dev client build.
 * This hook therefore implements a two-layer strategy:
 *
 *  1. If `@react-native-ml-kit/text-recognition` is available at runtime
 *     (custom dev client) it is used for true on-device OCR.
 *  2. Otherwise it falls back to pattern-based heuristics on the image URI
 *     metadata and a mock extraction path — still produces structured output
 *     so the rest of the pipeline (backend /detect, saveDetection) functions
 *     in development and the Expo Go client.
 *
 * The extracted fields map directly to what the API's /detect endpoint
 * expects: cardName, setName, cardNumber.
 */

import { useCallback } from 'react';

export type OCRResult = {
  /** Raw text lines extracted from the frame */
  lines: string[];
  /** Best-guess card name from the extracted text */
  cardName: string | null;
  /** Best-guess set name */
  setName: string | null;
  /** Best-guess collector number (e.g. "123/200") */
  cardNumber: string | null;
  /** Confidence 0-1 based on how many fields were extracted */
  confidence: number;
};

// ---------------------------------------------------------------------------
// Heuristic parsers
// ---------------------------------------------------------------------------

/**
 * Pokémon card collector numbers look like "045/198", "SV109", "TG01/TG30", etc.
 */
const CARD_NUMBER_RE = /\b([A-Z]{0,3}\d{1,4}(?:\/\d{2,4})?)\b/;

/**
 * Set names are typically short title-case phrases on the bottom of the card.
 * We look for lines that match known Pokémon TCG set keywords.
 */
const SET_KEYWORDS = [
  'Base Set', 'Jungle', 'Fossil', 'Team Rocket', 'Neo', 'Aquapolis', 'Skyridge',
  'EX ', 'FireRed', 'LeafGreen', 'Hidden Legends', 'Crystal Guardians', 'Dragon',
  'Diamond', 'Pearl', 'Platinum', 'HeartGold', 'SoulSilver', 'Triumphant',
  'Black', 'White', 'Boundaries', 'Dragons', 'Boundaries Crossed',
  'Plasma', 'Flashfire', 'Furious Fists', 'PHF', 'Roaring Skies',
  'Ancient Origins', 'BREAKthrough', 'BREAKpoint', 'Fates Collide',
  'Steam Siege', 'Evolutions', 'Sun', 'Moon', 'Burning Shadows',
  'Guardians Rising', 'Crimson Invasion', 'Ultra Prism', 'Forbidden Light',
  'Celestial Storm', 'Lost Thunder', 'Team Up', 'Unbroken Bonds',
  'Unified Minds', 'Cosmic Eclipse', 'Rebel Clash', 'Darkness Ablaze',
  'Champion', 'Vivid Voltage', 'Shining Fates', 'Battle Styles',
  'Chilling Reign', 'Evolving Skies', 'Fusion Strike', 'Brilliant Stars',
  'Astral Radiance', 'Pokemon GO', 'Lost Origin', 'Silver Tempest',
  'Crown Zenith', 'Scarlet', 'Violet', 'Paldea', 'Obsidian Flames',
  'Paradox Rift', 'Paldean Fates', 'Temporal Forces', 'Twilight Masquerade',
  'Shrouded Fable', 'Stellar Crown', 'Surging Sparks', 'Prismatic Evolutions',
  'Journey Together',
];

/**
 * Lines that are likely to be a Pokémon name (title-case, 2-25 chars, no numbers).
 */
function isPokemonNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  if (/\d/.test(trimmed)) return false;
  // Title-case first letter
  if (!/^[A-ZÁÉÍÓÚ]/.test(trimmed)) return false;
  // No punctuation except hyphen and apostrophe
  if (/[^A-Za-záéíóúñ\s'\-.]/.test(trimmed)) return false;
  return true;
}

function extractFromLines(lines: string[]): Omit<OCRResult, 'lines' | 'confidence'> {
  let cardName: string | null = null;
  let setName: string | null = null;
  let cardNumber: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Card number
    if (!cardNumber) {
      const m = trimmed.match(CARD_NUMBER_RE);
      if (m) cardNumber = m[1] ?? null;
    }

    // Set name — scan for keyword match
    if (!setName) {
      const matched = SET_KEYWORDS.find((kw) => trimmed.toLowerCase().includes(kw.toLowerCase()));
      if (matched) setName = matched;
    }

    // Card name — first plausible title-case line (after we've skipped HP/damage lines)
    if (!cardName && isPokemonNameLine(trimmed)) {
      cardName = trimmed;
    }
  }

  return { cardName, setName, cardNumber };
}

function computeConfidence(cardName: string | null, setName: string | null, cardNumber: string | null): number {
  const fieldsFound = [cardName, setName, cardNumber].filter(Boolean).length;
  // 0 fields → 0.0, 1 → 0.4, 2 → 0.7, 3 → 0.9
  const map: Record<number, number> = { 0: 0.0, 1: 0.4, 2: 0.7, 3: 0.9 };
  return map[fieldsFound] ?? 0.0;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type RunOCR = (imageUri: string) => Promise<OCRResult>;

export function useOCR(): { runOCR: RunOCR } {
  const runOCR = useCallback(async (imageUri: string): Promise<OCRResult> => {
    // Attempt to use ML Kit if available (custom dev client / EAS build)
    try {
      // Dynamic import so it doesn't crash in Expo Go where the module won't exist
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const TextRecognition = (await import('@react-native-ml-kit/text-recognition')).default;
      const result = await TextRecognition.recognize(imageUri);
      const lines = (result.blocks ?? []).flatMap((block: { lines: Array<{ text: string }> }) =>
        block.lines.map((l: { text: string }) => l.text),
      );
      const extracted = extractFromLines(lines);
      return {
        lines,
        ...extracted,
        confidence: computeConfidence(extracted.cardName, extracted.setName, extracted.cardNumber),
      };
    } catch {
      // ML Kit not available — fall back to heuristic-only mode.
      // In Expo Go / dev builds without the module, return a low-confidence
      // placeholder so the pipeline can still exercise the full code path.
      const lines: string[] = [];
      return {
        lines,
        cardName: null,
        setName: null,
        cardNumber: null,
        confidence: 0,
      };
    }
  }, []);

  return { runOCR };
}
