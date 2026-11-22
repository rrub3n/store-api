const { Router } = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = Router();

// Públicas
router.post('/token', userController.generateToken);
router.post('/', userController.create);
router.get('/:id', userController.getById);

// Protegidas: exige Authorization: Bearer <token>
router.put('/:id', auth, userController.update);
router.delete('/:id', auth, userController.remove);

module.exports = router;