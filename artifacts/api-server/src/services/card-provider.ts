export type CardProviderResult = {
  identified: boolean;
  confidence: number;
  card: {
    id: string;
    name: string;
    setName: string;
    number: string;
    imageUrl: string | null;
  } | null;
  reason: string;
};

type PokemonTcgResponse = {
  data?: Array<{
    id: string;
    name: string;
    number: string;
    images?: { small?: string; large?: string };
    set?: { name?: string };
  }>;
};

export async function identifyWithCardProvider(input: {
  cardName?: string | null;
  setName?: string | null;
  cardNumber?: string | null;
}): Promise<CardProviderResult> {
  const apiKey = process.env.CARD_API_KEY ?? process.env.PRICE_API_KEY;
  if (!apiKey) {
    return { identified: false, confidence: 0, card: null, reason: "CARD_API_KEY or PRICE_API_KEY is not configured." };
  }

  const filters: string[] = [];
  if (input.cardName?.trim()) filters.push(`name:"${input.cardName.trim().replaceAll('"', "")}"`);
  if (input.setName?.trim()) filters.push(`set.name:"${input.setName.trim().replaceAll('"', "")}"`);
  if (input.cardNumber?.trim()) filters.push(`number:"${input.cardNumber.trim().replaceAll('"', "")}"`);
  if (filters.length === 0) {
    return { identified: false, confidence: 0, card: null, reason: "No OCR metadata was provided." };
  }

  const response = await fetch(`https://api.pkmnprices.com/v1/cards?name=${encodeURIComponent(input.cardName?.trim() ?? "")}&per_page=20`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!response.ok) {
    return { identified: false, confidence: 0, card: null, reason: `Card provider returned HTTP ${response.status}.` };
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: number;
      name: string;
      number: string;
      image_url?: string | null;
      set?: { name?: string };
    }>;
  };
  const normalizedSet = input.setName?.trim().toLowerCase();
  const normalizedNumber = input.cardNumber?.trim().toLowerCase();
  const match = payload.data?.find((candidate) => {
    const setMatches = normalizedSet
      ? candidate.set?.name?.toLowerCase().includes(normalizedSet)
      : true;
    const numberMatches = normalizedNumber ? candidate.number.toLowerCase() === normalizedNumber : true;
    return setMatches && numberMatches;
  }) ?? payload.data?.[0];
  if (!match) {
    return { identified: false, confidence: 0, card: null, reason: "No matching card was returned." };
  }

  const exactSignals = [input.cardName, input.setName, input.cardNumber].filter(Boolean).length;
  const confidence = exactSignals >= 3 ? 0.94 : exactSignals === 2 ? 0.82 : 0.68;
  return {
    identified: confidence >= 0.8,
    confidence,
    card: {
      id: String(match.id),
      name: match.name,
      setName: match.set?.name ?? input.setName ?? "Unknown set",
      number: match.number,
      imageUrl: match.image_url ?? null,
    },
    reason: confidence >= 0.8 ? "Card metadata matched." : "Match confidence is below the safe threshold.",
  };
}