export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function createPaginatedResult<T>(
  data: T[],
  totalCount: number,
  params: PaginationParams
): PaginatedResult<T> {
  const { page, limit } = params;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function paginateArray<T>(
  array: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const { page, limit } = params;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = array.slice(startIndex, endIndex);

  return createPaginatedResult(paginatedData, array.length, params);
}

export function getOffsetFromPage(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function getPageFromOffset(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

// Helper to validate pagination parameters
export function validatePaginationParams(params: {
  page?: number;
  limit?: number;
}): PaginationParams {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10)); // Limit between 1-100

  return { page, limit };
}

// Hook for URL-based pagination state
export function usePaginationFromUrl(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  return validatePaginationParams({ page, limit });
}