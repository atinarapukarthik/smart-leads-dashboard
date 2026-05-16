import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
}

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ERROR]', err);

  let response: ErrorResponse = {
    success: false,
    message: 'Internal Server Error',
    statusCode: 500,
  };

  if (err.name === 'CastError') {
    response = {
      success: false,
      message: 'Invalid ID format',
      statusCode: 400,
    };
  } else if (err.name === 'ValidationError') {
    response = {
      success: false,
      message: err.message,
      statusCode: 400,
    };
  } else if (err.name === 'JsonWebTokenError') {
    response = {
      success: false,
      message: 'Invalid token',
      statusCode: 401,
    };
  } else if (err.name === 'TokenExpiredError') {
    response = {
      success: false,
      message: 'Token expired',
      statusCode: 401,
    };
  }

  res.status(response.statusCode).json(response);
};

export default errorHandler;
