const twilio = require("twilio");
const { Redis } = require("@upstash/redis");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const redis = new Redis({ url: process.env.UPSTASH_URL, token: process.env.UPSTASH_TOKEN });
  
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const { endpointNumber, callSid } = JSON.parse(Buffer.concat(buffers).toString() || "{}");

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // To 'Pass', we REJECT the call. 
    // FoneDynamics interprets a 'busy' signal as a cue to try the next number in the Queue.
    await client.calls(callSid).update({ status: "completed" }); 

    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    if (endpointNumber) await redis.del(`call:${endpointNumber}`);
    res.status(200).json({ ok: true, note: "Call already handled" });
  }
};
