const twilio = require('twilio');
const querystring = require('node:querystring');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const rawBody = Buffer.concat(buffers).toString();
  const params = querystring.parse(rawBody);

  // Twilio SDK prefixes custom params with 'Parameter_'
  const callSidToBridge = params.callSid || params.Parameter_callSid;

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  if (!callSidToBridge) {
    response.say("Error: No call ID found to bridge.");
  } else {
    const dial = response.dial();
    // Browser joins the room named after the Caller's SID
    dial.conference({
      beep: false,
      startConferenceOnEnter: true,
      endConferenceOnExit: true
    }, callSidToBridge);
  }

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(response.toString());
};
