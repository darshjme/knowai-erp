export function getPagination(query: URLSearchParams) {
  const page = Math.max(1, parseInt(query.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.get("pageSize") || "20")));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

// Alias for backwards compatibility
export function getPaginationParams(query: URLSearchParams, defaults?: { pageSize?: number }) {
  const page = Math.max(1, parseInt(query.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(query.get("pageSize") || String(defaults?.pageSize || 20))));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function paginatedResponse(data: any[], total: number, page: number, pageSize: number) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  };
}
