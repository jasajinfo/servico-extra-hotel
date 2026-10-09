export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (resource) =>
  new AppError(`${resource} não encontrado`, 404, 'NOT_FOUND');

export const conflict = (message) =>
  new AppError(message, 409, 'CONFLICT');
