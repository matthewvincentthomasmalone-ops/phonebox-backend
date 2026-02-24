const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const url = process.env.UPSTASH_URL;
  const token = process.env.UPSTASH_TOKEN;

  // --- DEBUG SECTION ---
  if (!url || !token) {
    res.statusCode = 500;
    // This line helps identify every variable Vercel is actually passing to the code
    const visibleKeys = Object.keys(process.env).filter(k => !k.startsWith('VERCEL') && !k.startsWith('AWS'));
    
    return res.end(JSON.stringify({ 
      ok: false, 
      error: "Credentials missing at runtime",
      detectedVariables: visibleKeys,
      lookingFor: ["REDIS_REST_URL", "REDIS_REST_TOKEN"]
    }));
  }

  try {
    const redis = new Redis({ url, token });
    const keys = await redis.keys("call:*");
    const calls = {};

    for (const key of keys) {
      const number = key.replace("call:", "");
      const data = await redis.get(key);
      calls[number] = data;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, calls }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
