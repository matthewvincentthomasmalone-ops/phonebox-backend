const xml = (str) => `<?xml version="1.0" encoding="UTF-8"?>\n${str}`;

const BUSINESS = {
  "+61851246362": {
    message:
      "Thanks for calling Wesley and Co’s Locks Ipswich. We’ve received your request. Please hold.",
  },
  "+61485016964": {
    message:
      "Thanks for calling Family Smiths Northside. We’ve received your request. Please hold.",
  },
  "+61485012051": {
    message:
      "Thanks for calling Golden Locksmith’s CBD. We’ve received your request. Please hold.",
  },
  "+61485025767": {
    message:
      "Thanks for calling Wagner’s Southside Locksmiths. We’ve received your request. Please hold.",
  },
  "+61485027225": {
    message:
      "Thanks for calling Southside Sam’s Locksmithing. We’ve received your request. Please hold.",
  },
};

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const endpointNumber = (url.searchParams.get("endpointNumber") || "").trim();

  const entry = BUSINESS[endpointNumber] || {
    message: "Thanks for calling. Please hold.",
  };

  res.setHeader("Content-Type", "text/xml");
  res.statusCode = 200;
  res.end(
    xml(`
<Response>
  <Say voice="alice">${entry.message}</Say>
  <Pause length="10"/>
  <Hangup/>
</Response>`.trim())
  );
};