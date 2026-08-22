export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** A network failure while refreshing the access token — not an auth failure. */
export class NetworkRefreshError extends Error {
  constructor() {
    super('Network error while refreshing session');
    this.name = 'NetworkRefreshError';
  }
}
