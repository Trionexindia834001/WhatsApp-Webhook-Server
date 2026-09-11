import { Router, type IRouter } from "express";
import type { Logger } from "pino";

const router: IRouter = Router();
const REPLY_TEXT = "Hello! Thanks for messaging. How can I help you?";

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env["WHATSAPP_VERIFY_TOKEN"] &&
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
  const recipients = getIncomingMessageSenders(payload);

  await Promise.all(
    recipients.map((recipient) => sendWhatsAppReply(recipient, log)),
  );
}

async function sendWhatsAppReply(recipient: string, log: Logger) {
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
            body: REPLY_TEXT,
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

function getIncomingMessageSenders(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.entry)) {
    return [];
  }

  const senders = new Set<string>();

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
          senders.add(sender);
        }
      }
    }
  }

  return [...senders];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default router;