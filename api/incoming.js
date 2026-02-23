const { Redis } = require("@upstash/redis");
const querystring = require("node:querystring");

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

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    res.statusCode = 500;
    res.end(xml(`<Response><Say>Error: Database connection failed.</Say></Response>`));
    return;
  }

  const redis = new Redis({ url, token });
  const raw = await readBody(req);
  const params = querystring.parse(raw);
  const callSid = String(params.CallSid || "");
  const to = String(params.To || "");

  if (callSid && to) {
    await redis.set(`call:${to}`, JSON.stringify({
      callSid,
      from: String(params.From || ""),
      to,
      startedAt: Date.now(),
    }), { ex: 600 });
  }

  res.setHeader("Content-Type", "text/xml");
  res.statusCode = 200;
  res.end(xml(`<Response><Say voice="alice">Please hold while we connect you.</Say><Pause length="600"/></Response>`));
};
