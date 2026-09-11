import { Router, type IRouter } from "express";

const router: IRouter = Router();

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
  req.log.info("Received WhatsApp webhook event");

  // Add message handling logic here. The parsed payload is available as req.body.
  res.sendStatus(200);
});

export default router;