const { Op, QueryTypes } = require('sequelize');
const { sequelize, Product, Category, ProductImage, ProductOption } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { parsePagination } = require('./pagination');
const imageStorage = require('./imageStorage');

const COLUMNS = [
  'id', 'enabled', 'name', 'slug', 'use_in_menu',
  'stock', 'description', 'price', 'price_with_discount',
];

const ALLOWED_FIELDS = [...COLUMNS, 'category_ids', 'images', 'options'];
const SHAPES = ['square', 'circle'];
const OPTION_TYPES = ['text', 'color'];

const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function validateFields(body) {
  const { enabled, name, slug, use_in_menu, stock, description, price, price_with_discount } = body;

  if (typeof name !== 'string' || !name.trim() || typeof slug !== 'string' || !slug.trim()) {
    throw new AppError(400, 'name e slug são obrigatórios');
  }
  if (!isPositiveNumber(price) || !isPositiveNumber(price_with_discount)) {
    throw new AppError(400, 'price e price_with_discount devem ser números maiores ou iguais a 0');
  }
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new AppError(400, 'enabled deve ser true ou false');
  }
  if (use_in_menu !== undefined && typeof use_in_menu !== 'boolean') {
    throw new AppError(400, 'use_in_menu deve ser true ou false');
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new AppError(400, 'stock deve ser um inteiro maior ou igual a 0');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new AppError(400, 'description deve ser um texto');
  }

  return { enabled, name, slug, use_in_menu, stock, description, price, price_with_discount };
}

function parseCategoryIds(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((id) => Number.isInteger(id) && id > 0)) {
    throw new AppError(400, 'category_ids deve ser uma lista de ids');
  }
  return [...new Set(value)]; // remove ids repetidos
}

function parseLists(body) {
  const images = body.images ?? [];
  const options = body.options ?? [];
  if (!Array.isArray(images) || !Array.isArray(options)) {
    throw new AppError(400, 'images e options devem ser listas');
  }
  return { images, options };
}

function normalizeOption(option, { partial = false } = {}) {
  if (!option || typeof option !== 'object') {
    throw new AppError(400, 'Cada opção deve ser um objeto');
  }

  const result = {};

  const values = option.values ?? option.value;

  if (!partial || option.title !== undefined) {
    if (typeof option.title !== 'string' || !option.title.trim()) {
      throw new AppError(400, 'title da opção é obrigatório');
    }
    result.title = option.title;
  }

  const shape = option.shape ?? (partial ? undefined : 'square');
  if (shape !== undefined) {
    if (!SHAPES.includes(shape)) throw new AppError(400, 'shape deve ser square ou circle');
    result.shape = shape;
  }

  const type = option.type ?? (partial ? undefined : 'text');
  if (type !== undefined) {
    if (!OPTION_TYPES.includes(type)) throw new AppError(400, 'type da opção deve ser text ou color');
    result.type = type;
  }

  if (!partial || values !== undefined) {
    if (
      !Array.isArray(values) || values.length === 0 ||
      !values.every((v) => typeof v === 'string' && v.trim() && !v.includes(','))
    ) {
      throw new AppError(400, 'values deve ser uma lista de textos (sem vírgula dentro do valor)');
    }
    result.values = values.join(',');
  }

  if (option.radius !== undefined || !partial) {
    const radius = option.radius === undefined ? 0 : parseInt(option.radius, 10);
    if (Number.isNaN(radius) || radius < 0) {
      throw new AppError(400, 'radius deve ser um número maior ou igual a 0');
    }
    result.radius = radius;
  }

  return result;
}

function validateProduct(body) {
  const fields = validateFields(body);
  const categoryIds = parseCategoryIds(body.category_ids) ?? [];
  const { images, options } = parseLists(body);

  images.forEach((image) => imageStorage.validate(image));

  return {
    fields,
    categoryIds,
    images,
    options: options.map((option) => normalizeOption(option)),
  };
}

async function assertCategoriesExist(ids) {
  if (ids.length === 0) return;
  const found = await Category.count({ where: { id: ids } });
  if (found !== ids.length) {
    throw new AppError(400, 'Uma ou mais categorias não existem');
  }
}

function buildInclude(wanted) {
  const include = [];
  if (!wanted || wanted.has('category_ids')) {
    include.push({ model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } });
  }
  if (!wanted || wanted.has('images')) {
    include.push({ model: ProductImage, as: 'images', attributes: ['id', 'path'] });
  }
  if (!wanted || wanted.has('options')) {
    include.push({ model: ProductOption, as: 'options' });
  }
  return include;
}

function format(product, baseUrl, wanted) {
  const json = product.toJSON();
  const result = {};

  COLUMNS.forEach((column) => {
    if (json[column] !== undefined) result[column] = json[column];
  });

  if (json.categories) {
    result.category_ids = json.categories.map((category) => category.id);
  }
  if (json.images) {
    result.images = json.images.map((image) => ({
      id: image.id,
      content: `${baseUrl}/media/${image.path}`,
    }));
  }
  if (json.options) {
    result.options = json.options.map((option) => ({
      id: option.id,
      title: option.title,
      shape: option.shape,
      radius: option.radius,
      type: option.type,
      values: option.values.split(','),
    }));
  }

  if (wanted) {
    Object.keys(result).forEach((key) => {
      if (!wanted.has(key)) delete result[key];
    });
  }
  return result;
}

function planImageChanges(images, currentImages) {
  const byId = new Map(currentImages.map((image) => [image.id, image]));
  const plan = { add: [], replace: [], remove: [] };

  images.forEach((item) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(400, 'Cada imagem deve ser um objeto');
    }

    // Sem id: imagem nova
    if (item.id === undefined) {
      imageStorage.validate(item);
      plan.add.push(item);
      return;
    }

    const current = byId.get(item.id);
    if (!current) {
      throw new AppError(400, `A imagem ${item.id} não pertence a este produto`);
    }

    // Com id e deleted: remover
    if (item.deleted === true) {
      plan.remove.push(current);
      return;
    }

    if (typeof item.content !== 'string') {
      throw new AppError(400, 'content é obrigatório para alterar uma imagem');
    }
    // Com id e content em URL: a imagem continua igual
    if (/^https?:\/\//.test(item.content)) return;

    imageStorage.validate(item);
    plan.replace.push({ current, item });
  });

  return plan;
}

function planOptionChanges(options, currentOptions) {
  const byId = new Map(currentOptions.map((option) => [option.id, option]));
  const plan = { add: [], update: [], remove: [] };

  options.forEach((item) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(400, 'Cada opção deve ser um objeto');
    }

    // Sem id: opção nova (campos completos)
    if (item.id === undefined) {
      plan.add.push(normalizeOption(item));
      return;
    }

    const current = byId.get(item.id);
    if (!current) {
      throw new AppError(400, `A opção ${item.id} não pertence a este produto`);
    }

    if (item.deleted === true) {
      plan.remove.push(current);
      return;
    }

    // Com id: altera só os campos enviados
    plan.update.push({ current, data: normalizeOption(item, { partial: true }) });
  });

  return plan;
}

// USO

// POST /v1/product
async function create(body, baseUrl) {
  const { fields, categoryIds, images, options } = validateProduct(body);
  await assertCategoriesExist(categoryIds);

  // Transação: ou salva tudo (produto, categorias, imagens, opções) ou nada
  const transaction = await sequelize.transaction();
  let productId;

  try {
    const product = await Product.create(fields, { transaction });
    productId = product.id;

    if (categoryIds.length > 0) {
      await product.setCategories(categoryIds, { transaction });
    }

    for (const image of images) {
      const filePath = imageStorage.save(product.id, image);
      await ProductImage.create({ product_id: product.id, enabled: true, path: filePath }, { transaction });
    }

    if (options.length > 0) {
      await ProductOption.bulkCreate(
        options.map((option) => ({ ...option, product_id: product.id })),
        { transaction }
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    if (productId) imageStorage.removeProductFolder(productId); // não deixa arquivos órfãos
    throw error;
  }

  return getById(productId, baseUrl);
}

// GET /v1/product/:id
async function getById(id, baseUrl) {
  const product = await Product.findByPk(id, { include: buildInclude() });
  if (!product) {
    throw new AppError(404, 'Produto não encontrado');
  }
  return format(product, baseUrl);
}

// GET /v1/product/search
async function search(query, baseUrl) {
  const { limit, page, offset } = parsePagination(query);
  const where = {};
  const idSets = []; // listas de ids de produtos que atendem cada filtro (depois fazemos a interseção)

  // ?fields=name,images,price
  let wanted = null;
  if (query.fields) {
    const requested = String(query.fields).split(',').map((field) => field.trim());
    const invalid = requested.filter((field) => !ALLOWED_FIELDS.includes(field));
    if (invalid.length > 0) {
      throw new AppError(400, `Campos inválidos: ${invalid.join(', ')}`);
    }
    wanted = new Set(requested);
  }

  // ?match=Tênis  (procura no nome ou na descrição)
  if (query.match) {
    const term = `%${String(query.match)}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { description: { [Op.like]: term } }];
  }

  // ?price-range=100-200
  if (query['price-range']) {
    const match = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(String(query['price-range']));
    if (!match || Number(match[1]) > Number(match[2])) {
      throw new AppError(400, 'price-range deve ter o formato 100-200');
    }
    where.price = { [Op.between]: [Number(match[1]), Number(match[2])] };
  }

  // ?category_ids=15,24  (produtos que estão em alguma dessas categorias)
  if (query.category_ids) {
    const ids = String(query.category_ids).split(',').map(Number);
    if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
      throw new AppError(400, 'category_ids deve ser uma lista de ids separados por vírgula');
    }
    const rows = await sequelize.query(
      'SELECT DISTINCT product_id FROM product_categories WHERE category_id IN (:ids)',
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
    idSets.push(rows.map((row) => row.product_id));
  }

  // produtos cuja opção 45 tenha o valor GG ou PP
  if (query.option !== undefined) {
    if (typeof query.option !== 'object' || Array.isArray(query.option)) {
      throw new AppError(400, 'option deve ter o formato option[id]=valor1,valor2');
    }
    for (const [optionId, rawValues] of Object.entries(query.option)) {
      if (!Number.isInteger(Number(optionId))) {
        throw new AppError(400, 'O id dentro de option[] deve ser um número');
      }
      const searched = String(rawValues).split(',');
      const option = await ProductOption.findByPk(optionId);
      const matches = option && option.values.split(',').some((value) => searched.includes(value));
      idSets.push(matches ? [option.product_id] : []);
    }
  }

  // Une os filtros: o produto precisa atender todos
  if (idSets.length > 0) {
    const ids = idSets.reduce((acc, set) => acc.filter((id) => set.includes(id)));
    if (ids.length === 0) {
      return { data: [], total: 0, limit, page };
    }
    where.id = ids;
  }

  // 1 consulta: só os ids da página e o total (leve e com contagem correta)
  const { count, rows } = await Product.findAndCountAll({
    where,
    attributes: ['id'],
    limit: limit === -1 ? undefined : limit,
    offset: limit === -1 ? undefined : offset,
    order: [['id', 'ASC']],
  });

  // 2 consulta: os dados completos só desses produtos
  const products = rows.length === 0 ? [] : await Product.findAll({
    where: { id: rows.map((row) => row.id) },
    attributes: wanted ? [...new Set(['id', ...COLUMNS.filter((c) => wanted.has(c))])] : undefined,
    include: buildInclude(wanted),
    order: [['id', 'ASC']],
  });

  return {
    data: products.map((product) => format(product, baseUrl, wanted)),
    total: count,
    limit,
    page,
  };
}

// PUT /v1/product/:id
async function update(id, body) {
  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError(404, 'Produto não encontrado');
  }

  const fields = validateFields(body);
  const categoryIds = parseCategoryIds(body.category_ids);
  const { images, options } = parseLists(body);

  if (categoryIds) await assertCategoriesExist(categoryIds);

  const currentImages = await ProductImage.findAll({ where: { product_id: product.id } });
  const currentOptions = await ProductOption.findAll({ where: { product_id: product.id } });
  const imagePlan = planImageChanges(images, currentImages);
  const optionPlan = planOptionChanges(options, currentOptions);

  // Campos não enviados (undefined) não devem sobrescrever o valor atual
  const cleanFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

  // Guarda os caminhos dos arquivos antigos: eles só são apagados depois do commit
  const oldPaths = [
    ...imagePlan.remove.map((image) => image.path),
    ...imagePlan.replace.map(({ current }) => current.path),
  ];
  const newPaths = []; // arquivos novos gravados (apagados se der erro)

  // 2) Grava tudo numa transação
  const transaction = await sequelize.transaction();

  try {
    await product.update(cleanFields, { transaction });

    if (categoryIds) {
      await product.setCategories(categoryIds, { transaction });
    }

    // Imagens
    for (const image of imagePlan.remove) {
      await image.destroy({ transaction });
    }
    for (const { current, item } of imagePlan.replace) {
      const newPath = imageStorage.save(product.id, item);
      newPaths.push(newPath);
      await current.update({ path: newPath }, { transaction });
    }
    for (const item of imagePlan.add) {
      const newPath = imageStorage.save(product.id, item);
      newPaths.push(newPath);
      await ProductImage.create({ product_id: product.id, enabled: true, path: newPath }, { transaction });
    }

    // Opções
    for (const option of optionPlan.remove) {
      await option.destroy({ transaction });
    }
    for (const { current, data } of optionPlan.update) {
      await current.update(data, { transaction });
    }
    if (optionPlan.add.length > 0) {
      await ProductOption.bulkCreate(
        optionPlan.add.map((option) => ({ ...option, product_id: product.id })),
        { transaction }
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    newPaths.forEach((filePath) => imageStorage.remove(filePath)); // desfaz os arquivos novos
    throw error;
  }

  oldPaths.forEach((filePath) => imageStorage.remove(filePath));
}
// DELETE /v1/product/:id
async function remove(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError(404, 'Produto não encontrado');
  }

  await product.destroy();

  imageStorage.removeProductFolder(product.id);
}

module.exports = { create, getById, search, update, remove };