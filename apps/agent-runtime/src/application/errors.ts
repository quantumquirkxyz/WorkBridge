export class ApplicationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApplicationError";
    this.status = status;
    this.code = code;
  }
}
