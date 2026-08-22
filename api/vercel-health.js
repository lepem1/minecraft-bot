module.exports = function handler(request, response) {
  response.status(200).json({
    ok: true,
    serverless: true,
    liveBotSupported: false,
    reason: 'Vercel serverless functions cannot keep the long-lived TCP and WebSocket sessions required by Mineflayer and prismarine-viewer. Deploy the Node server on a long-running host for live bot control.'
  });
};
