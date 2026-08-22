module.exports = function handler(request, response) {
  response.status(200).json({
    minecraftHost: process.env.MINECRAFT_HOST || 'localhost',
    minecraftPort: Number(process.env.MINECRAFT_PORT || 25565),
    minecraftVersion: process.env.MINECRAFT_VERSION || '1.20.4',
    botUsername: process.env.BOT_USERNAME || 'MyBot',
    authMode: process.env.MINECRAFT_AUTH || 'offline',
    viewerPort: Number(process.env.VIEWER_PORT || 3007),
    authRequired: true,
    deployment: {
      serverlessCompatible: false,
      reason: 'This Vercel deployment is static/serverless. Live bot control requires the long-running Node server from src/index.js.'
    }
  });
};
