class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorHandler(err, req, res, next) {

  const status = err.status || 500;

  if (status === 500) console.error(err);

  res.status(status).json({
    message: status === 500 ? 'Erro interno do servidor' : err.message,
  });
}

module.exports = { AppError, errorHandler };