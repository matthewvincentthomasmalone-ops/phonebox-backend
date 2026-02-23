module.exports = async (req, res) => {
  // 1. Enable CORS so your GitHub Pages site can read this data
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // 2. Access the shared memory object used by incoming.js
  // We use the same global name defined in your other files
  const phonebox = global.__PHONEBOX__ || { activeByEndpoint: new Map() }; [cite: 19, 20]
  
  // 3. Convert the Map to a standard Object for JSON transmission
  const activeCalls = Object.fromEntries(phonebox.activeByEndpoint); [cite: 20, 24]

  // 4. Return the data to your frontend
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    ok: true,
    calls: activeCalls,
    serverTime: Date.now()
  });
};
