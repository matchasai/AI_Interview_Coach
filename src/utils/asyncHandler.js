/**
 * Wraps an async Express handler and forwards errors to next().
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
