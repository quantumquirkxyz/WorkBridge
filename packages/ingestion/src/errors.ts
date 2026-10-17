export class IngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionError';
  }
}

export class UnsupportedSourceError extends IngestionError {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedSourceError';
  }
}

export class SourceTooLargeError extends IngestionError {
  constructor(actualBytes: number, maxBytes: number) {
    super(`Source is ${actualBytes} bytes, which exceeds the ${maxBytes}-byte limit`);
    this.name = 'SourceTooLargeError';
  }
}

export class OcrUnavailableError extends IngestionError {
  constructor() {
    super(
      'No OCR provider is available for image input. Provide `altText`, configure a vision adapter, or install tesseract.js.',
    );
    this.name = 'OcrUnavailableError';
  }
}
