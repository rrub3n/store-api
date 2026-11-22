const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token não informado'));
  }

  const token = header.split(' ')[1];

  try {

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return next(new AppError(401, 'Token inválido ou expirado'));
  }
}

module.exports = auth;