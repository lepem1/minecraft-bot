module.exports = function handler(request, response) {
  response.status(501).json({
    error: 'Live Mineflayer bot connections cannot run inside Vercel serverless functions. Deploy src/index.js on a persistent Node host, then point the dashboard at that backend.'
  });
};
