export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

export class InvalidVacancyError extends CatalogError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVacancyError';
  }
}
