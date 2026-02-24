const twilio = require('twilio');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // Parse the parameters sent from app.js (device.connect)
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const data = new URLSearchParams(Buffer.concat(buffers).toString());
  
  const to = data.get("To");
  const callSid = data.get("callSid");

  console.log(`Bridging browser to call: ${callSid} for number: ${to}`);

  /**
   * THE MAGIC LOGIC:
   * We tell Twilio to connect the current WebRTC stream (the browser)
   * to the existing phone call using the <Dial> verb.
   */
  const dial = response.dial();
  dial.number(to);

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(response.toString());
};
