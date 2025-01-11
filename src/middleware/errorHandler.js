import { StatusCodes } from 'http-status-codes';

export function errorHandler(err, req, res, next) {
  console.error(err.stack);

  res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || StatusCodes.INTERNAL_SERVER_ERROR
    }
  });
}
