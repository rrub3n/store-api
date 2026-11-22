const categoryService = require('../services/categoryService');

// GET /v1/category/search
async function search(req, res, next) {
  try {
    const result = await categoryService.search(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// GET /v1/category/:id
async function getById(req, res, next) {
  try {
    const category = await categoryService.getById(req.params.id);
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
}

// POST /v1/category
async function create(req, res, next) {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

// PUT /v1/category/:id
async function update(req, res, next) {
  try {
    await categoryService.update(req.params.id, req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// DELETE /v1/category/:id
async function remove(req, res, next) {
  try {
    await categoryService.remove(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { search, getById, create, update, remove };