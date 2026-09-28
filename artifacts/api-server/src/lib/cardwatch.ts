import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cardsTable,
  detectionsTable,
  pricesTable,
  settingsTable,
} from "@workspace/db";

export const defaultSettings = {
  discordEnabled: true,
  minimumConfidence: 85,
  scanInterval: 3,
  duplicateCooldown: 10,
  backendUrl: "",
};

export async function getCardWatchSettings() {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1)).limit(1);
  if (!row) {
    const [created] = await db.insert(settingsTable).values({ id: 1 }).returning();
    return created ?? { id: 1, ...defaultSettings, updatedAt: new Date() };
  }
  return row;
}

export async function getLatestDetectionForCard(cardId: string | null, cardName: string) {
  const filters = cardId
    ? eq(detectionsTable.cardId, cardId)
    : eq(detectionsTable.cardName, cardName);
  const [row] = await db.select().from(detectionsTable).where(filters).orderBy(desc(detectionsTable.detectedAt)).limit(1);
  return row;
}

export function toDetectionResponse(row: typeof detectionsTable.$inferSelect, duplicate = false) {
  return {
    id: row.id,
    cardId: row.cardId,
    cardName: row.cardName,
    setName: row.setName,
    cardNumber: row.cardNumber,
    imageUrl: row.imageUrl,
    detectedPrice: row.detectedPrice,
    rawPrice: row.rawPrice,
    psa9Price: row.psa9Price,
    psa10Price: row.psa10Price,
    confidence: row.confidence,
    detectedAt: row.detectedAt.toISOString(),
    source: row.source,
    duplicate,
  };
}

export function toPriceResponse(row: typeof pricesTable.$inferSelect | undefined, cardId: string) {
  return {
    cardId,
    raw: row?.raw ?? null,
    psa9: row?.psa9 ?? null,
    psa10: row?.psa10 ?? null,
    recentSales: row?.recentSales ?? [],
    currency: row?.currency ?? "USD",
    source: row?.source ?? "unavailable",
    available: Boolean(row),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

export { cardsTable, detectionsTable, pricesTable, settingsTable };