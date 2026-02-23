const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Manually grab variables to ensure they exist
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ 
      ok: false, 
      error: "Critical: Database credentials missing in Vercel environment",
      debug: { urlMissing: !url, tokenMissing: !token }
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
