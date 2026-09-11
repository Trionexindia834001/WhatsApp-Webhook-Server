import { Router, type IRouter } from "express";
import type { Logger } from "pino";

const router: IRouter = Router();
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken =
    process.env["WHATSAPP_VERIFY_TOKEN"] ?? process.env["VERIFY_TOKEN"];

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    typeof challenge === "string"
  ) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

router.post("/webhook", (req, res) => {
  // Acknowledge the webhook before doing any outbound work.
  res.sendStatus(200);

  void replyToIncomingMessages(req.body, req.log);
});

async function replyToIncomingMessages(payload: unknown, log: Logger) {
  const messages = getIncomingMessages(payload);

  await Promise.all(
    messages.map(({ sender, text }) => sendWhatsAppReply(sender, text, log)),
  );
}

async function sendWhatsAppReply(
  recipient: string,
  incomingText: string,
  log: Logger,
) {
  const accessToken = process.env["WHATSAPP_TOKEN"];
  const phoneNumberId = process.env["PHONE_NUMBER_ID"];

  if (!accessToken || !phoneNumberId) {
    log.error(
      "WHATSAPP_TOKEN and PHONE_NUMBER_ID are required to send WhatsApp replies",
    );
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: {
            body: incomingText
              ? `Aapka message mila: "${incomingText}"`
              : "Aapka message mila.",
          },
        }),
      },
    );

    if (!response.ok) {
      log.error(
        {
          statusCode: response.status,
          responseBody: await response.text(),
          recipient,
        },
        "WhatsApp API reply failed",
      );
      return;
    }

    log.info({ recipient }, "WhatsApp reply sent");
  } catch (error) {
    log.error({ err: error, recipient }, "WhatsApp API request failed");
  }
}

function getIncomingMessages(
  payload: unknown,
): Array<{ sender: string; text: string }> {
  if (!isRecord(payload) || !Array.isArray(payload.entry)) {
    return [];
  }

  const messages: Array<{ sender: string; text: string }> = [];

  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value)) {
        continue;
      }

      const messages = change.value["messages"];
      if (!Array.isArray(messages)) {
        continue;
      }

      for (const message of messages) {
        if (!isRecord(message) || typeof message.from !== "string") {
          continue;
        }

        const sender = message.from.trim();
        if (sender) {
          const text =
            isRecord(message.text) && typeof message.text.body === "string"
              ? message.text.body
              : "";
          messages.push({ sender, text });
        }
      }
    }
  }

  return messages;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default router;