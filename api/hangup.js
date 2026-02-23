const twilio = require("twilio");
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Read the body to get the CallSid
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const body = JSON.parse(Buffer.concat(buffers).toString() || "{}");

  const { endpointNumber, callSid } = body;
  const finalCallSid = callSid || (await redis.get(`call:${endpointNumber}`))?.callSid;

  if (!finalCallSid) {
    return res.status(400).json({ ok: false, error: "No active CallSid found." });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // End the call in Twilio
    await client.calls(finalCallSid).update({ status: "completed" });
    
    // Remove from Redis so the UI clears
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
