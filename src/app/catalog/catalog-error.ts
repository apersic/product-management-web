export type ApiIssue = {
  readonly path: string;
  readonly message: string;
};

export class CatalogError extends Error {
  readonly status: number;
  readonly issues: readonly ApiIssue[];

  constructor(status: number, message: string, issues: readonly ApiIssue[] = []) {
    super(message);
    this.name = 'CatalogError';
    this.status = status;
    this.issues = issues;
  }
}
