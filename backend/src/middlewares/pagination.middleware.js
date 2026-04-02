const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parses `?page=` and `?limit=` from the query string.
 * Attaches `req.pagination = { page, limit, offset }`.
 * Always continues — invalid values fall back to defaults silently.
 */
function parsePagination(req, res, next) {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };
  next();
}

/**
 * Builds a pagination meta block for a response.
 * @param {number} total   - total row count (from COUNT(*))
 * @param {object} pag     - req.pagination { page, limit }
 */
function paginationMeta(total, { page, limit }) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = {
  parsePagination,
  paginationMeta,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
