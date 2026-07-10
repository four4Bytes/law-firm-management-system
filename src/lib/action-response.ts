export interface ActionStatusResponse {
  success: boolean;
  error?: string;
}

export interface ActionDataResponse<T> extends ActionStatusResponse {
  data?: T;
}
