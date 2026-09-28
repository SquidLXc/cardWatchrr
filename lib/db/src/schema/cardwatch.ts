import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cardsTable = pgTable("cardwatch_cards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  setName: text("set_name").notNull(),
  number: text("number").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const detectionsTable = pgTable("cardwatch_detections", {
  id: text("id").primaryKey(),
  cardId: text("card_id"),
  cardName: text("card_name").notNull(),
  setName: text("set_name").notNull(),
  cardNumber: text("card_number").notNull(),
  imageUrl: text("image_url"),
  detectedPrice: doublePrecision("detected_price"),
  rawPrice: doublePrecision("raw_price"),
  psa9Price: doublePrecision("psa9_price"),
  psa10Price: doublePrecision("psa10_price"),
  confidence: doublePrecision("confidence").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pricesTable = pgTable("cardwatch_prices", {
  cardId: text("card_id").primaryKey(),
  raw: doublePrecision("raw"),
  psa9: doublePrecision("psa9"),
  psa10: doublePrecision("psa10"),
  recentSales: jsonb("recent_sales").$type<number[]>().notNull().default([]),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settingsTable = pgTable("cardwatch_settings", {
  id: integer("id").primaryKey().default(1),
  discordEnabled: boolean("discord_enabled").notNull().default(true),
  minimumConfidence: integer("minimum_confidence").notNull().default(85),
  scanInterval: integer("scan_interval").notNull().default(3),
  duplicateCooldown: integer("duplicate_cooldown").notNull().default(10),
  backendUrl: text("backend_url").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});