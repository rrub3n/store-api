const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('../middleware/errorHandler');

const MEDIA_DIR = path.join(__dirname, '..', '..', 'public', 'media');

const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg' };

function cleanBase64(content) {
  return content.replace(/^data:image\/\w+;base64,/, '').trim();
}

function resolveType(image) {
  if (image.type) return image.type;
  const data = cleanBase64(image.content);
  if (data.startsWith('iVBORw0KGgo')) return 'image/png';
  if (data.startsWith('/9j/')) return 'image/jpeg';
  return undefined;
}

function validate(image) {
  if (!image || typeof image !== 'object') {
    throw new AppError(400, 'Cada imagem deve ser um objeto com type e content');
  }
  if (typeof image.content !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(cleanBase64(image.content))) {
    throw new AppError(400, 'content da imagem deve ser um base64 válido');
  }
  if (!EXTENSIONS[resolveType(image)]) {
    throw new AppError(400, 'Tipo de imagem inválido (use image/png, image/jpeg ou image/jpg)');
  }
}

function save(productId, image) {
  const dir = path.join(MEDIA_DIR, `product-${productId}`);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${EXTENSIONS[resolveType(image)]}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(cleanBase64(image.content), 'base64'));

  return `product-${productId}/${filename}`;
}

function remove(relativePath) {
  fs.rmSync(path.join(MEDIA_DIR, relativePath), { force: true });
}

function removeProductFolder(productId) {
  fs.rmSync(path.join(MEDIA_DIR, `product-${productId}`), { recursive: true, force: true });
}

module.exports = { validate, save, remove, removeProductFolder };