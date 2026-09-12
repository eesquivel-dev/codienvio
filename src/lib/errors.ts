export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, "PROVIDER_ERROR", details);
    this.name = "ProviderError";
  }
}

export function errorToResponse(error: unknown): {
  status: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    const zodError = error as { flatten?: () => unknown; issues?: unknown };
    return {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos",
          details: zodError.flatten?.() ?? zodError.issues,
        },
      },
    };
  }

  console.error(error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Ocurrió un error inesperado",
      },
    },
  };
}
