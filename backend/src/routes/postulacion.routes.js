const router = require('express').Router();
const ctrl = require('../controllers/postulacion.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// Alumno/egresado
router.post('/', verifyToken, authorizeRoles('alumno', 'egresado'), ctrl.postular);
router.get('/mis', verifyToken, authorizeRoles('alumno', 'egresado'), ctrl.getMisPostulaciones);

// Empresa
router.get('/oferta/:ofertaId', verifyToken, authorizeRoles('empresa'), ctrl.getPostulacionesByOferta);
router.patch('/:id/estado', verifyToken, authorizeRoles('empresa'), ctrl.updateEstado);

module.exports = router;
