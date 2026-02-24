const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Manual Database Connection
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

  // Try to find the CallSid in database if button didn't send it
  if (!finalCallSid && endpointNumber) {
    const cachedData = await redis.get(`call:${endpointNumber}`);
    if (cachedData) finalCallSid = cachedData.callSid;
  }

  if (!finalCallSid) {
    // If no call found, still try to clear Redis to stop UI "Ghosting"
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    return res.status(400).json({ ok: false, error: "No active CallSid found." });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // Attempt to hang up the live call
    await client.calls(finalCallSid).update({ status: "completed" });
  } catch (err) {
    console.log("Twilio call already gone, proceeding to clear DB...");
  } finally {
    // CRITICAL: Always delete the key from Redis, regardless of Twilio's state
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    res.status(200).json({ ok: true });
    
  } catch (err) {
    // Forced cleanup: delete Redis key even if Twilio fails
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    res.status(500).json({ ok: false, error: err.message });
  }
};
