const { Router } = require('express');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');

const router = Router();

router.use('/user', userRoutes);
router.use('/category', categoryRoutes);
router.use('/product', productRoutes);

module.exports = router;