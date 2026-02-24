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

  const redis = new Redis({ 
    url: process.env.UPSTASH_URL, 
    token: process.env.UPSTASH_TOKEN 
  });

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const bodyRaw = Buffer.concat(buffers).toString("utf8");
  const body = bodyRaw ? JSON.parse(bodyRaw) : {};

  const { endpointNumber, callSid } = body;

  if (!callSid) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: "No active CallSid provided" }));
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // Generate TwiML to move the CALLER into a Conference
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    const dial = response.dial();
    // The caller enters a room named after their own SID
    dial.conference({
      waitUrl: '', // Stops the default music once they are 'answered'
      beep: false,
      startConferenceOnEnter: true,
      endConferenceOnExit: true
    }, callSid);

    // Update the live call with this TwiML
    await client.calls(callSid).update({ twiml: response.toString() });

    // Remove from 'Ringing' status in Redis
    if (endpointNumber) {
      await redis.del(`call:${endpointNumber}`);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, message: "Caller moved to conference" }));
  } catch (err) {
    console.error("Answer Error:", err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
