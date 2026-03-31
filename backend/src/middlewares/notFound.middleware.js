function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Not Found: ${req.method} ${req.originalUrl}`,
    },
  });
}

module.exports = notFoundMiddleware;
