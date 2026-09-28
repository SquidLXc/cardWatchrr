type DetectionForDiscord = {
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl?: string | null;
  rawPrice?: number | null;
  psa9Price?: number | null;
  psa10Price?: number | null;
  confidence: number;
  detectedAt: string;
};

type DiscordResult = { sent: boolean; message: string };

export async function sendDiscordTest(): Promise<DiscordResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return { sent: false, message: "DISCORD_WEBHOOK_URL is not configured." };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "CardWatch Discord connection test." }),
  });
  if (!response.ok) {
    return { sent: false, message: `Discord returned HTTP ${response.status}.` };
  }
  return { sent: true, message: "Test notification sent." };
}

export async function notifyDiscord(detection: DetectionForDiscord): Promise<DiscordResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return { sent: false, message: "DISCORD_WEBHOOK_URL is not configured." };
  }

  const fields = [
    { name: "Set", value: `${detection.setName} · ${detection.cardNumber}`, inline: true },
    { name: "Confidence", value: `${Math.round(detection.confidence * 100)}%`, inline: true },
    { name: "Raw", value: detection.rawPrice == null ? "Price unavailable" : `$${detection.rawPrice.toFixed(2)}`, inline: true },
    { name: "PSA 9", value: detection.psa9Price == null ? "Price unavailable" : `$${detection.psa9Price.toFixed(2)}`, inline: true },
    { name: "PSA 10", value: detection.psa10Price == null ? "Price unavailable" : `$${detection.psa10Price.toFixed(2)}`, inline: true },
  ];

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "CARD DETECTED",
          description: `**${detection.cardName}**`,
          color: 0xb7f34a,
          fields,
          image: detection.imageUrl ? { url: detection.imageUrl } : undefined,
          timestamp: detection.detectedAt,
        },
      ],
    }),
  });
  if (!response.ok) {
    return { sent: false, message: `Discord returned HTTP ${response.status}.` };
  }
  return { sent: true, message: "Detection notification sent." };
}