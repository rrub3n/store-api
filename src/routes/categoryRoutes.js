const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');

const router = Router();

router.get('/search', categoryController.search);
router.get('/:id', categoryController.getById);

router.post('/', auth, categoryController.create);
router.put('/:id', auth, categoryController.update);
router.delete('/:id', auth, categoryController.remove);

module.exports = router;