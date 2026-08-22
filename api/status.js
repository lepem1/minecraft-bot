module.exports = function handler(request, response) {
  response.status(200).json({
    state: 'serverless-static',
    status: {
      state: 'serverless-static',
      online: false,
      username: process.env.BOT_USERNAME || 'MyBot',
      health: 0,
      food: 0,
      position: { x: 0, y: 0, z: 0 }
    }
  });
};
