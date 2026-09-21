class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new ApiError(400, message, details);
const unauthorized = (message = "Log in to continue.") => new ApiError(401, message);
const forbidden = (message = "You do not have permission to do that.") => new ApiError(403, message);
const notFound = (message = "Not found.") => new ApiError(404, message);
const conflict = (message, details) => new ApiError(409, message, details);

/** Lets route handlers throw instead of hand-rolling try/catch everywhere. */
function asyncHandler(fn) {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === "function") result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}.` });
}

function errorHandler(isProduction) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const status = err.status || 500;

    if (status >= 500) {
      console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    }

    const body = {
      message:
        status >= 500
          ? "Something went wrong on the server. Please try again."
          : err.message || "Request failed.",
    };
    if (err.conflicts) body.conflicts = err.conflicts;
    if (err.details) body.details = err.details;
    if (!isProduction && status >= 500) body.stack = err.stack;

    res.status(status).json(body);
  };
}

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
