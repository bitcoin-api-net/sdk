export type OpenApiOperation = Record<string, unknown> & {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
};

export type OpenApiPathItem = Partial<Record<string, OpenApiOperation>>;

export type OpenApiSchema = {
  openapi?: string;
  info?: Record<string, unknown>;
  paths?: Record<string, OpenApiPathItem>;
  components?: Record<string, unknown>;
};

export const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type FoundOperation = {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
};
