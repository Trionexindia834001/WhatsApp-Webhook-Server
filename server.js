const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN =
  process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
const PRICING_REPLY =
  "Our services start at ₹4999/month. Contact us for details.";
const LOCATION_REPLY =
  "We are located at Kantatoli, Ranchi, Tata Road, near Union Bank.";
const GREETING_REPLY =
  "Hello! Welcome to Trionex India. How can I help you today?";
const DEFAULT_REPLY =
  "Thanks for reaching out! Type 'price' for pricing info or 'location' for our address.";

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  // Meta requires a fast acknowledgement. Do not wait for the Cloud API call.
  res.sendStatus(200);

  void replyToIncomingMessages(req.body).catch((error) => {
    console.error("Failed to process WhatsApp webhook:", error);
  });
});

async function replyToIncomingMessages(payload) {
  const messages = getIncomingMessages(payload);

  await Promise.all(
    messages.map((message) => {
      return sendReply(message.from, getReplyForMessage(message.text));
    }),
  );
}

function getReplyForMessage(message) {
  const text = message.toLowerCase();

  if (text.includes("price") || text.includes("cost")) {
    return PRICING_REPLY;
  } else if (text.includes("location") || text.includes("address")) {
    return LOCATION_REPLY;
  } else if (text.includes("hi") || text.includes("hello")) {
    return GREETING_REPLY;
  } else {
    return DEFAULT_REPLY;
  }
}

function getIncomingMessages(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const messages = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const incomingMessages = Array.isArray(change?.value?.messages)
        ? change.value.messages
        : [];

      for (const message of incomingMessages) {
        if (typeof message?.from !== "string" || !message.from.trim()) {
          continue;
        }

        messages.push({
          from: message.from.trim(),
          text:
            typeof message.text?.body === "string" ? message.text.body : "",
        });
      }
    }
  }

  return messages;
}

async function sendReply(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_TOKEN and PHONE_NUMBER_ID must be configured to send replies.",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body },
      }),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `WhatsApp Cloud API returned ${response.status}: ${responseBody}`,
    );
  }
}

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`WhatsApp webhook server listening on port ${port}`);
});

