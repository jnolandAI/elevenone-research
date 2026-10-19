export type ErrorCode =
  | 'invalid_request'
  | 'not_found'
  | 'not_configured'
  | 'upstream_error'
  | 'rate_limited'
  | 'unauthorized';

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  not_found: 404,
  rate_limited: 429,
  upstream_error: 502,
  not_configured: 503,
};

/** An error a caller can act on. Its message is safe to show: it never carries a credential. */
export class ToolError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly source?: string,
  ) {
    super(message);
    this.name = 'ToolError';
  }

  get status(): number {
    return STATUS[this.code];
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.source ? { source: this.source } : {}) } };
  }
}

export function invalid(message: string): ToolError {
  return new ToolError('invalid_request', message);
}
