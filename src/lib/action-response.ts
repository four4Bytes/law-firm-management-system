/** Standard envelope returned by write Server Actions (create/update/delete). */
export interface ActionStatusResponse {
  /** Whether the action completed successfully. */
  success: boolean;
  /** Human-readable error message surfaced to the client when `success` is false. */
  error?: string;
}

/**
 * Status envelope that additionally carries an optionally typed success payload.
 *
 * @typeParam T - The shape of the payload carried on success.
 */
export interface ActionDataResponse<T> extends ActionStatusResponse {
  /** Payload returned to the caller on success (e.g. the persisted record). */
  data?: T;
}
