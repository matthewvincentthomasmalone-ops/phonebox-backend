const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const redis = new Redis({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN,
  });

  // Collect request body
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const data = JSON.parse(Buffer.concat(buffers).toString() || "{}");
  const { endpointNumber, callSid } = data;

  // 1. Check Redis for a fallback SID if the frontend didn't send one
  let finalCallSid = callSid;
  if (!finalCallSid && endpointNumber) {
    const cached = await redis.get(`call:${endpointNumber}`);
    if (cached) finalCallSid = cached.callSid;
  }

  // 2. Clear the UI state regardless of whether Twilio succeeds
  // This prevents "Ghost Tiles" from staying red
  if (!finalCallSid) {
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    return res.status(200).json({ ok: true, note: "Local state cleared" });
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // 3. Attempt to kill the call in Twilio
    await client.calls(finalCallSid).update({ status: "completed" });
    console.log(`Terminated SID: ${finalCallSid}`);

  } catch (err) {
    // We catch the error but return 200 OK so the GUI clears the tile.
    // Error 21220 means the call is already over.
    console.error("Twilio termination error (call likely already ended):", err.message);
  } finally {
    // 4. Final Cleanup: Always wipe the Redis key to stop the dashboard ringing
    if (endpointNumber) {
      await redis.del(`call:${endpointNumber}`);
    }
    return res.status(200).json({ ok: true, message: "Endpoint reset to idle" });
  }
};
