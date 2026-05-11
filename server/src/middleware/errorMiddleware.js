/**
 * Global Express error handler.
 * Catches errors thrown or passed via next(err) in route handlers.
 */
export const errorHandler = (err, req, res, next) => {
  console.error("[errorHandler]", err.stack || err.message);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
