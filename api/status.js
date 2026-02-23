const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  // Enable CORS so your GitHub site can read the data
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  try {
    // Find all active call keys
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
