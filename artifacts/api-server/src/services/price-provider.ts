export type PriceResult = {
  cardId: string;
  raw: number | null;
  psa9: number | null;
  psa10: number | null;
  recentSales: number[];
  currency: string;
  source: string;
  available: boolean;
  updatedAt: string | null;
};

type PkmnPricesCard = {
  id: number;
  name: string;
  image_url?: string | null;
  number: string;
  set?: { name?: string };
  prices?: Array<{
    source?: string;
    currency?: string;
    condition?: string;
    market_price?: number | null;
    created_at?: string;
  }>;
};

export async function getCardPrice(cardId: string): Promise<PriceResult> {
  const priceApiKey = process.env.PRICE_API_KEY;
  if (!priceApiKey) {
    return {
      cardId,
      raw: null,
      psa9: null,
      psa10: null,
      recentSales: [],
      currency: "USD",
      source: "unavailable",
      available: false,
      updatedAt: null,
    };
  }

  const response = await fetch(`https://api.pkmnprices.com/v1/cards/${encodeURIComponent(cardId)}`, {
    headers: { "X-API-Key": priceApiKey },
  });
  if (!response.ok) {
    return {
      cardId,
      raw: null,
      psa9: null,
      psa10: null,
      recentSales: [],
      currency: "USD",
      source: `pkmnprices:error:${response.status}`,
      available: false,
      updatedAt: null,
    };
  }

  const card = (await response.json()) as PkmnPricesCard;
  const marketPrices = (card.prices ?? [])
    .map((price) => price.market_price)
    .filter((price): price is number => typeof price === "number");
  const nearMint = (card.prices ?? []).find(
    (price) => price.condition === "Near Mint" && typeof price.market_price === "number",
  );
  const latestTimestamp = (card.prices ?? [])
    .map((price) => price.created_at)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  return {
    cardId,
    raw: nearMint?.market_price ?? null,
    psa9: null,
    psa10: null,
    recentSales: marketPrices.slice(0, 20),
    currency: card.prices?.find((price) => price.currency)?.currency ?? "USD",
    source: "pkmnprices:tcgplayer",
    available: marketPrices.length > 0,
    updatedAt: latestTimestamp ?? null,
  };
}