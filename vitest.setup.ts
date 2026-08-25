import { afterEach, beforeEach, vi } from "vitest";

const noop = (): void => {};

const errorSpy = vi.spyOn(console, "error").mockImplementation(noop);
const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

beforeEach(() => {
  errorSpy.mockClear();
  warnSpy.mockClear();
});

afterEach(() => {
  errorSpy.mockClear();
  warnSpy.mockClear();
});
