const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, Category, Product, ProductImage, ProductOption } = require('../src/models');

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function resetDatabase() {

  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase só pode rodar com NODE_ENV=test');
  }
  await ProductImage.destroy({ where: {} });
  await ProductOption.destroy({ where: {} });
  await Product.destroy({ where: {} });
  await Category.destroy({ where: {} });
  await User.destroy({ where: {} });
}

// Cadastra um usuário, faz login e devolve o token JWT
async function getToken() {
  const user = {
    firstname: 'Maria',
    surname: 'Silva',
    email: 'maria@mail.com',
    password: '123@123',
    confirmPassword: '123@123',
  };
  await request(app).post('/v1/user').send(user);
  const res = await request(app).post('/v1/user/token').send({ email: user.email, password: user.password });
  return res.body.token;
}

// Converte a URL de uma imagem no caminho do arquivo em disco
function mediaFilePath(url) {
  return path.join(__dirname, '..', 'public', 'media', url.split('/media/')[1]);
}

// Fecha a conexão com o banco (senão o Jest não encerra)
async function closeDatabase() {
  await sequelize.close();
}

module.exports = { PNG_BASE64, resetDatabase, getToken, mediaFilePath, closeDatabase };