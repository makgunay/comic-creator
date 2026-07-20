export class PdfExportError extends Error {
  readonly code = "export";

  constructor(message: string) {
    super(message);
    this.name = "PdfExportError";
  }
}
