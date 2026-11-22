const { Category } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { parsePagination } = require('./pagination');

// Campos que o cliente pode pedir em ?fields=
const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

// Busca a categoria ou lança 404
async function findOrFail(id) {
  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError(404, 'Categoria não encontrada');
  }
  return category;
}

// Valida o corpo de POST e PUT
function validate({ name, slug, use_in_menu }) {
  if (typeof name !== 'string' || !name.trim() || typeof slug !== 'string' || !slug.trim()) {
    throw new AppError(400, 'name e slug são obrigatórios');
  }
  if (use_in_menu !== undefined && typeof use_in_menu !== 'boolean') {
    throw new AppError(400, 'use_in_menu deve ser true ou false');
  }
}

// GET /v1/category/search
async function search(query) {
  const { limit, page, offset } = parsePagination(query);

  // Filtro opcional: ?use_in_menu=true
  const where = {};
  if (query.use_in_menu !== undefined) {
    if (!['true', 'false'].includes(query.use_in_menu)) {
      throw new AppError(400, 'use_in_menu deve ser true ou false');
    }
    where.use_in_menu = query.use_in_menu === 'true';
  }

  // Limita os campos retornados: ?fields=name,slug
  let attributes;
  if (query.fields) {
    attributes = query.fields.split(',').map((field) => field.trim());
    const invalid = attributes.filter((field) => !ALLOWED_FIELDS.includes(field));
    if (invalid.length > 0) {
      throw new AppError(400, `Campos inválidos: ${invalid.join(', ')}`);
    }
  }

  // findAndCountAll devolve as linhas da página e o total geral (sem o limit)
  const { count, rows } = await Category.findAndCountAll({
    where,
    attributes,
    limit: limit === -1 ? undefined : limit,
    offset: limit === -1 ? undefined : offset,
    order: [['id', 'ASC']],
  });

  return { data: rows, total: count, limit, page };
}

// GET /v1/category/:id
async function getById(id) {
  return findOrFail(id);
}

// POST /v1/category
async function create(body) {
  validate(body);
  const { name, slug, use_in_menu } = body;
  return Category.create({ name, slug, use_in_menu });
}

// PUT /v1/category/:id
async function update(id, body) {
  const category = await findOrFail(id);
  validate(body);
  const { name, slug, use_in_menu } = body;
  await category.update({ name, slug, use_in_menu });
}

// DELETE /v1/category/:id
async function remove(id) {
  const category = await findOrFail(id);
  await category.destroy();
}

module.exports = { search, getById, create, update, remove };