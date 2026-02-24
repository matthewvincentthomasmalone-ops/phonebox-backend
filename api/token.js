const twilio = require('twilio');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Use your existing Vercel environment variables
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY, // You may need to generate an API Key in Twilio Console
    process.env.TWILIO_API_SECRET
  );

  token.identity = 'dashboard_user_' + Math.floor(Math.random() * 1000);

  const grant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  });
  token.addGrant(grant);

  res.status(200).json({ token: token.toJwt() });
};
