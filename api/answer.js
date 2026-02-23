const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  withCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ ok: false, error: "Database credentials missing" });
  }

  const redis = new Redis({ url, token });
  
  // Read body manually
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const body = JSON.parse(Buffer.concat(buffers).toString() || "{}");

  const endpointNumber = body.endpointNumber;
  let callSid = body.callSid;

  // Retrieve CallSid from Redis if it wasn't provided by the frontend
  if (!callSid && endpointNumber) {
    const data = await redis.get(`call:${endpointNumber}`);
    if (data) callSid = data.callSid;
  }

  if (!callSid) {
    return res.status(400).json({ ok: false, error: "No active CallSid found" });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const playUrl = `${proto}://${host}/api/play?endpointNumber=${encodeURIComponent(endpointNumber || "")}`;

  try {
    // Redirect the call to play the business-specific message
    await client.calls(callSid).update({ url: playUrl, method: "POST" });
    
    // Clear the call from Redis so it stops ringing in the UI
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
