require('dotenv').config();
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const config = dbConfig[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const User = require('./User')(sequelize);
const Category = require('./Category')(sequelize);
const Product = require('./Product')(sequelize);
const ProductImage = require('./ProductImage')(sequelize);
const ProductOption = require('./ProductOption')(sequelize);

Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductOption, { as: 'options', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductOption.belongsTo(Product, { foreignKey: 'product_id' });

Product.belongsToMany(Category, {
  through: 'product_categories',
  as: 'categories',
  foreignKey: 'product_id',
  otherKey: 'category_id',
  timestamps: false,
});
Category.belongsToMany(Product, {
  through: 'product_categories',
  as: 'products',
  foreignKey: 'category_id',
  otherKey: 'product_id',
  timestamps: false,
});

module.exports = { sequelize, User, Category, Product, ProductImage, ProductOption };