module.exports = function handler(request, response) {
  response.status(501).json({ error: 'No long-running bot process exists in this Vercel serverless deployment.' });
};
