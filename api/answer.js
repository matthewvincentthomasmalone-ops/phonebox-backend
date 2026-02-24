const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Manual Database Connection
  const url = process.env.UPSTASH_URL;
  const token = process.env.UPSTASH_TOKEN;

  if (!url || !token) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: "Database credentials missing" }));
  }

  const redis = new Redis({ url, token });

  // Read JSON body
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const bodyRaw = Buffer.concat(buffers).toString("utf8");
  const body = bodyRaw ? JSON.parse(bodyRaw) : {};

  const endpointNumber = body.endpointNumber;
  let callSid = body.callSid;

  // Fetch CallSid from Redis if missing
  if (!callSid && endpointNumber) {
    const cachedData = await redis.get(`call:${endpointNumber}`);
    if (cachedData) {
      callSid = cachedData.callSid;
    }
  }

  if (!callSid) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: "No active call found for this number." }));
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] || "https").toString();
  const playUrl = `${proto}://${host}/api/play?endpointNumber=${encodeURIComponent(endpointNumber || "")}`;

  try {
    // Redirect call to greeting
    await client.calls(callSid).update({ url: playUrl, method: "POST" });

    // Clear from Redis to stop the "Ringing" state in UI
    if (endpointNumber) {
      await redis.del(`call:${endpointNumber}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, callSid }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
