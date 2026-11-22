const { AppError } = require('../middleware/errorHandler');

function parsePagination(query) {
  const limit = query.limit === undefined ? 12 : Number(query.limit);
  const page = query.page === undefined ? 1 : Number(query.page);

  if (!Number.isInteger(limit) || (limit !== -1 && limit < 1)) {
    throw new AppError(400, 'limit deve ser -1 ou um inteiro maior que 0');
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'page deve ser um inteiro maior que 0');
  }

  const offset = limit === -1 ? 0 : (page - 1) * limit;

  return { limit, page, offset };
}

module.exports = { parsePagination };