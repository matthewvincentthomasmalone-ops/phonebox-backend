const { Redis } = require("@upstash/redis");
const querystring = require("node:querystring");

// Automatically loads KV_REST_API_URL and KV_REST_API_TOKEN from Vercel
const redis = Redis.fromEnv();

const xml = (str) => `<?xml version="1.0" encoding="UTF-8"?>\n${str}`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const raw = await readBody(req);
  const params = querystring.parse(raw);
  const callSid = String(params.CallSid || "");
  const from = String(params.From || "");
  const to = String(params.To || "");

  if (callSid && to) {
    // Store the call in Redis for 10 minutes (600 seconds)
    await redis.set(`call:${to}`, JSON.stringify({
      callSid,
      from,
      to,
      startedAt: Date.now(),
    }), { ex: 600 });
  }

  res.setHeader("Content-Type", "text/xml");
  res.statusCode = 200;
  res.end(
    xml(`
<Response>
  <Say voice="alice">Please hold while we connect you.</Say>
  <Pause length="600"/>
</Response>`.trim())
  );
};
