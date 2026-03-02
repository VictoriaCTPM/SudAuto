module.exports = function handler(req, res) {
  res.json({
    status: 'ok',
    ocrConfigured: !!(
      process.env.GEMINI_API_KEY ||
      process.env.AI_INTEGRATIONS_GEMINI_API_KEY
    ),
    nodeVersion: process.version,
  });
};
