const path = require('path');
const express = require('express');
const routes = require('./routes');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

const app = express();

// Permite ler filtros como option[45]=GG,PP na query string
app.set('query parser', 'extended');

// Limite maior porque as imagens dos produtos chegam em base64
app.use(express.json({ limit: '10mb' }));

// Evita erro quando a requisição chega sem body
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

// Imagens salvas ficam acessíveis em http://localhost:3000/media/...
app.use('/media', express.static(path.join(__dirname, '..', 'public', 'media')));

// Documentação interativa em http://localhost:3000/docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Todas as rotas da API ficam sob /v1
app.use('/v1', routes);

// Rota inexistente
app.use((req, res, next) => next(new AppError(404, 'Rota não encontrada')));

app.use(errorHandler);

module.exports = app;