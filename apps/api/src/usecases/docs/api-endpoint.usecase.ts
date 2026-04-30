import {
  OpenApiRepository,
  openApiRepository,
} from '#src/repositories/openapi.repository.js';

export type ExecuteParams = {
  method: string;
  path: string;
};

export type ApiEndpointResult = {
  method: string;
  path: string;
  operation: Record<string, unknown>;
};

export class ApiEndpointUseCase {
  constructor(private readonly openApi: OpenApiRepository) {}

  async execute(params: ExecuteParams): Promise<ApiEndpointResult | null> {
    const found = this.openApi.findOperation(params.method, params.path);
    if (!found) return null;
    return {
      method: found.method.toUpperCase(),
      path: found.path,
      operation: found.operation,
    };
  }
}

export const apiEndpointUseCase = new ApiEndpointUseCase(openApiRepository);
