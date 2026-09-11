# WhatsApp Webhook Server

Simple Node.js Express server for Meta's WhatsApp Cloud API.

## Run

```bash
npm install
npm start
```

The server listens on `process.env.PORT`, or port `3000` locally.

## Environment variables

- `VERIFY_TOKEN` or `WHATSAPP_VERIFY_TOKEN` — Meta webhook verification token
- `WHATSAPP_TOKEN` — WhatsApp Cloud API access token
- `PHONE_NUMBER_ID` — WhatsApp phone number ID
- `WHATSAPP_API_VERSION` — optional Graph API version, default `v22.0`

## Routes

- `GET /webhook` — Meta webhook verification
- `POST /webhook` — acknowledges incoming events immediately and sends replies asynchronously