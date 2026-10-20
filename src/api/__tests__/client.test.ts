import { afterEach, describe, expect, it, vi } from "vitest";

// `API_KEY` is read from `import.meta.env.VITE_API_KEY` once, at module load -- so each
// case that needs a different value stubs the env *before* a fresh dynamic import
// (`vi.resetModules()` forces a new module instance; a top-level static `import` would
// share the first-loaded module's already-evaluated `API_KEY` across every test).
describe("request() attaches X-API-Key only when VITE_API_KEY is configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("sends no X-API-Key header when VITE_API_KEY is unset", async () => {
    vi.stubEnv("VITE_API_KEY", "");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { getHealth } = await import("../client");
    await getHealth();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBeUndefined();
  });

  it("sends X-API-Key when VITE_API_KEY is configured", async () => {
    vi.stubEnv("VITE_API_KEY", "secret-123");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { getHealth } = await import("../client");
    await getHealth();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("secret-123");
  });
});
