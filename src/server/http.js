const express = require('express');
const path = require('path');
const http = require('http');
const createRoutes = require('./routes');
function createHttpServer(config, botManager) { const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '32kb' })); app.use(createRoutes(config, botManager)); app.use(express.static(path.join(__dirname, '../../public'), { extensions: ['html'] })); return http.createServer(app); }
module.exports = createHttpServer;
