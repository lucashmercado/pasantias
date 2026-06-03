'use strict';

/**
 * Fábrica de middleware de validación.
 *
 * Recibe una función validadora que acepta req.body y devuelve:
 *   null         → válido, continúa al siguiente handler
 *   string       → mensaje de error; responde 400 y corta la cadena
 *
 * Uso en rutas:
 *   router.post('/', validate(miValidator), miController);
 */
const validate = (validatorFn) => (req, res, next) => {
  const error = validatorFn(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  next();
};

module.exports = validate;
