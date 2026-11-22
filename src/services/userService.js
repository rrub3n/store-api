const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Remove a senha antes de devolver o usuário
function toPublic(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  };
}

// Busca o usuário ou lança 404
async function findOrFail(id) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado');
  }
  return user;
}

// CADASTRO USUARIO
async function create({ firstname, surname, email, password, confirmPassword }) {
  if (!firstname || !surname || !email || !password || !confirmPassword) {
    throw new AppError(400, 'Todos os campos são obrigatórios');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'E-mail inválido');
  }
  if (password !== confirmPassword) {
    throw new AppError(400, 'As senhas não conferem');
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) {
    throw new AppError(400, 'E-mail já cadastrado');
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({ firstname, surname, email, password: hash });
  return toPublic(user);
}

// Login: confere e-mail e senha e devolve o token JWT
async function generateToken({ email, password }) {
  if (!email || !password) {
    throw new AppError(400, 'E-mail e senha são obrigatórios');
  }

  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(400, 'E-mail ou senha inválidos');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return { token };
}

// Busca pelo ID
async function getById(id) {
  const user = await findOrFail(id);
  return toPublic(user);
}

// Atualiza NOME, SOBRENOME E EMAIL
async function update(id, { firstname, surname, email }) {
  const user = await findOrFail(id);

  if (!firstname || !surname || !email) {
    throw new AppError(400, 'firstname, surname e email são obrigatórios');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'E-mail inválido');
  }

  // O e-mail não pode pertencer a OUTRO usuário (o próprio pode manter o dele)
  const emailInUse = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
  if (emailInUse) {
    throw new AppError(400, 'E-mail já cadastrado');
  }

  await user.update({ firstname, surname, email });
}

// REMOVER USUARIO
async function remove(id) {
  const user = await findOrFail(id);
  await user.destroy();
}

module.exports = { create, generateToken, getById, update, remove };