const productService = require('../services/productService');

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// GET /v1/product/search
async function search(req, res, next) {
  try {
    const result = await productService.search(req.query, baseUrl(req));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// GET /v1/product/:id
async function getById(req, res, next) {
  try {
    const product = await productService.getById(req.params.id, baseUrl(req));
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

// POST /v1/product
async function create(req, res, next) {
  try {
    const product = await productService.create(req.body, baseUrl(req));
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

// PUT /v1/product/:id
async function update(req, res, next) {
  try {
    await productService.update(req.params.id, req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// DELETE /v1/product/:id
async function remove(req, res, next) {
  try {
    await productService.remove(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { search, getById, create, update, remove };