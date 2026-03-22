const router = require('express').Router();
const ctrl = require('../controllers/oferta.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// Rutas públicas
router.get('/', ctrl.getOfertas);
router.get('/:id', ctrl.getOfertaById);

// Rutas empresa
router.post('/', verifyToken, authorizeRoles('empresa'), ctrl.createOferta);
router.put('/:id', verifyToken, authorizeRoles('empresa'), ctrl.updateOferta);
router.delete('/:id', verifyToken, authorizeRoles('empresa'), ctrl.deleteOferta);

module.exports = router;
