import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { cardsTable, detectionsTable, pricesTable, settingsTable } from "@workspace/db";
import {
  AnalyzeCandidateBody,
  CreateDetectionBody,
  IdentifyCardBody,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import {
  defaultSettings,
  getCardWatchSettings,
  getLatestDetectionForCard,
  toDetectionResponse,
  toPriceResponse,
} from "../lib/cardwatch";
import { notifyDiscord, sendDiscordTest } from "../services/discord";
import { identifyWithCardProvider } from "../services/card-provider";
import { getCardPrice } from "../services/price-provider";

const router: IRouter = Router();

router.get("/detections", async (_req, res, next) => {
  try {
    const rows = await db.select().from(detectionsTable).orderBy(desc(detectionsTable.detectedAt)).limit(100);
    res.json(rows.map((row) => toDetectionResponse(row)));
  } catch (error) {
    next(error);
  }
});

router.post("/detections", async (req, res, next) => {
  try {
    const input = CreateDetectionBody.parse(req.body);
    const settings = await getCardWatchSettings();
    const duplicate = input.cardId
      ? await getLatestDetectionForCard(input.cardId, input.cardName)
      : await getLatestDetectionForCard(null, input.cardName);
    const detectedAt = input.detectedAt ? new Date(input.detectedAt) : new Date();
    const isDuplicate = Boolean(
      duplicate && detectedAt.getTime() - duplicate.detectedAt.getTime() < settings.duplicateCooldown * 1000,
    );

    if (isDuplicate) {
      res.status(200).json(toDetectionResponse(duplicate, true));
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const [row] = await db
      .insert(detectionsTable)
      .values({
        id,
        cardId: input.cardId ?? null,
        cardName: input.cardName,
        setName: input.setName,
        cardNumber: input.cardNumber,
        imageUrl: input.imageUrl ?? null,
        detectedPrice: input.detectedPrice ?? null,
        rawPrice: input.rawPrice ?? null,
        psa9Price: input.psa9Price ?? null,
        psa10Price: input.psa10Price ?? null,
        confidence: input.confidence,
        detectedAt,
        source: input.source,
      })
      .returning();

    if (!row) {
      res.status(500).json({ message: "Detection could not be saved." });
      return;
    }

    if (input.cardId && input.cardName && input.setName && input.cardNumber) {
      await db
        .insert(cardsTable)
        .values({
          id: input.cardId,
          name: input.cardName,
          setName: input.setName,
          number: input.cardNumber,
          imageUrl: input.imageUrl ?? null,
        })
        .onConflictDoUpdate({
          target: cardsTable.id,
          set: { name: input.cardName, setName: input.setName, number: input.cardNumber, imageUrl: input.imageUrl ?? null },
        });
    }

    if (settings.discordEnabled && input.confidence >= settings.minimumConfidence / 100) {
      const notification = toDetectionResponse(row);
      await notifyDiscord({
        cardName: notification.cardName,
        setName: notification.setName,
        cardNumber: notification.cardNumber,
        imageUrl: notification.imageUrl,
        rawPrice: notification.rawPrice,
        psa9Price: notification.psa9Price,
        psa10Price: notification.psa10Price,
        confidence: notification.confidence,
        detectedAt: notification.detectedAt,
      });
    }

    res.status(201).json(toDetectionResponse(row));
  } catch (error) {
    next(error);
  }
});

router.post("/detect", async (req, res, next) => {
  try {
    const input = AnalyzeCandidateBody.parse(req.body);

    const settings = await getCardWatchSettings();
    const meetsThreshold = input.confidence >= settings.minimumConfidence / 100;
    if (!meetsThreshold) {
      res.json({
        detected: false,
        confidence: input.confidence,
        boundingBox: input.boundingBox,
        identification: null,
        reason: "Candidate confidence is below the configured threshold.",
      });
      return;
    }

    const identification = await identifyWithCardProvider(input);
    const price = identification.card ? await getCardPrice(identification.card.id) : null;
    res.json({
      detected: true,
      confidence: input.confidence,
      boundingBox: input.boundingBox,
      identification: identification.identified
        ? { ...identification, price }
        : null,
      reason: identification.reason,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/identify", async (req, res, next) => {
  try {
    const input = IdentifyCardBody.parse(req.body);
    const identification = await identifyWithCardProvider(input);
    const price = identification.card ? await getCardPrice(identification.card.id) : null;
    res.json({ ...identification, price });
  } catch (error) {
    next(error);
  }
});

router.get("/cards/:id", async (req, res, next) => {
  try {
    const [card] = await db.select().from(cardsTable).where(eq(cardsTable.id, req.params.id)).limit(1);
    if (!card) {
      res.status(404).json({ message: "Card not found." });
      return;
    }
    res.json({ id: card.id, name: card.name, setName: card.setName, number: card.number, imageUrl: card.imageUrl });
  } catch (error) {
    next(error);
  }
});

router.get("/prices/:id", async (req, res, next) => {
  try {
    const [price] = await db.select().from(pricesTable).where(eq(pricesTable.cardId, req.params.id)).limit(1);
    if (price) {
      res.json(toPriceResponse(price, req.params.id));
      return;
    }

    const providerPrice = await getCardPrice(req.params.id);
    if (providerPrice.available) {
      await db
        .insert(pricesTable)
        .values({
          cardId: req.params.id,
          raw: providerPrice.raw,
          psa9: providerPrice.psa9,
          psa10: providerPrice.psa10,
          recentSales: providerPrice.recentSales,
          currency: providerPrice.currency,
          source: providerPrice.source,
          updatedAt: providerPrice.updatedAt ? new Date(providerPrice.updatedAt) : new Date(),
        })
        .onConflictDoUpdate({
          target: pricesTable.cardId,
          set: {
            raw: providerPrice.raw,
            psa9: providerPrice.psa9,
            psa10: providerPrice.psa10,
            recentSales: providerPrice.recentSales,
            currency: providerPrice.currency,
            source: providerPrice.source,
            updatedAt: providerPrice.updatedAt ? new Date(providerPrice.updatedAt) : new Date(),
          },
        });
    }
    res.json(providerPrice);
  } catch (error) {
    next(error);
  }
});

router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await getCardWatchSettings();
    res.json({
      discordEnabled: settings.discordEnabled,
      minimumConfidence: settings.minimumConfidence,
      scanInterval: settings.scanInterval,
      duplicateCooldown: settings.duplicateCooldown,
      backendUrl: settings.backendUrl,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const input = UpdateSettingsBody.parse(req.body);
    const current = await getCardWatchSettings();
    const [settings] = await db
      .insert(settingsTable)
      .values({
        id: 1,
        discordEnabled: input.discordEnabled ?? current.discordEnabled,
        minimumConfidence: input.minimumConfidence ?? current.minimumConfidence,
        scanInterval: input.scanInterval ?? current.scanInterval,
        duplicateCooldown: input.duplicateCooldown ?? current.duplicateCooldown,
        backendUrl: input.backendUrl ?? current.backendUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    res.json({
      discordEnabled: settings?.discordEnabled ?? current.discordEnabled,
      minimumConfidence: settings?.minimumConfidence ?? current.minimumConfidence,
      scanInterval: settings?.scanInterval ?? current.scanInterval,
      duplicateCooldown: settings?.duplicateCooldown ?? current.duplicateCooldown,
      backendUrl: settings?.backendUrl ?? current.backendUrl,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/discord/test", async (_req, res, next) => {
  try {
    res.json(await sendDiscordTest());
  } catch (error) {
    next(error);
  }
});

export default router;