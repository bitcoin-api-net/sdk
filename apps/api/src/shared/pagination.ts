export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
}

export interface PaginatedResponseWithTotal<T> extends PaginatedResponse<T> {
  total: number;
}

export interface PaginationDbParams {
  skip: number;
  take: number;
}

export function paginationQueryToDbParams(
  query: PaginationQuery,
  options?: { defaultPerPage?: number }
): PaginationDbParams {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? options?.defaultPerPage ?? 20;
  return {
    skip: (page - 1) * perPage,
    take: perPage,
  };
}
