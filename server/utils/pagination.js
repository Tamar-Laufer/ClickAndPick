'use strict';

function clampPaging({ page, limit, defLimit, maxLimit }) {
  const lim = Math.min(Math.max(Number(limit) || defLimit, 1), maxLimit);
  const pg = Math.max(Number(page) || 1, 1);
  return { pg, lim };
}

function paginationMeta(pg, lim, total) {
  const totalPages = Math.max(Math.ceil(total / lim), 1);
  return { currentPage: pg, totalPages, totalItems: total, hasMore: pg < totalPages };
}

function paginated(items, total, pg, lim) {
  return { items, pagination: paginationMeta(pg, lim, total) };
}

module.exports = { clampPaging, paginationMeta, paginated };
