const HttpError = require('../utils/httpError');

const errorMiddleware = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err.stack);
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorMiddleware;
