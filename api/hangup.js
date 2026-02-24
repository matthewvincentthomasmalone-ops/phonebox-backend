const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const url = process.env.UPSTASH_URL;
  const token = process.env.UPSTASH_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ ok: false, error: "Database credentials missing" });
  }

  const redis = new Redis({ url, token });

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const body = JSON.parse(Buffer.concat(buffers).toString() || "{}");

  const { endpointNumber, callSid } = body;
  let finalCallSid = callSid;

  if (!finalCallSid && endpointNumber) {
    const data = await redis.get(`call:${endpointNumber}`);
    if (data) finalCallSid = data.callSid;
  }

  if (!finalCallSid) {
    return res.status(400).json({ ok: false, error: "Call not found" });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // Tell Twilio to hang up the call
    await client.calls(finalCallSid).update({ status: "completed" });
    
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
