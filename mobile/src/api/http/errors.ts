export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkRefreshError extends Error {
  constructor() {
    super('Network error while refreshing session');
    this.name = 'NetworkRefreshError';
  }
}
