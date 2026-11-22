const userService = require('../services/userService');

// POST /v1/user
async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

// POST /v1/user/token
async function generateToken(req, res, next) {
  try {
    const result = await userService.generateToken(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// GET /v1/user/:id
async function getById(req, res, next) {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

// PUT /v1/user/:id
async function update(req, res, next) {
  try {
    await userService.update(req.params.id, req.body);
    res.status(204).send(); // 204 não leva corpo
  } catch (error) {
    next(error);
  }
}

// DELETE /v1/user/:id
async function remove(req, res, next) {
  try {
    await userService.remove(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { create, generateToken, getById, update, remove };