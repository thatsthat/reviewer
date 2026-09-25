import { describe, expect, it } from "vitest";
import { tanstackStartPlugin } from "./plugin.js";
import type { TanStackStartPluginOptions } from "./plugin.js";

function createPlugin(options?: TanStackStartPluginOptions) {
  const plugin = tanstackStartPlugin(options);
  const resolveId = plugin.resolveId as (id: string, importer?: string) => string | null;
  const config = (plugin.config as () => Record<string, unknown>)();
  return { plugin, resolveId, config };
}

describe("tanstackStartPlugin", () => {
  it("has the correct name", () => {
    const { plugin } = createPlugin();
    expect(plugin.name).toBe("storybook-tanstack-start");
  });

  it("enforces pre", () => {
    const { plugin } = createPlugin();
    expect(plugin.enforce).toBe("pre");
  });

  describe("resolveId", () => {
    it("intercepts @tanstack/react-start", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("@tanstack/react-start")).toBeTruthy();
    });

    it("intercepts @tanstack/react-start sub-paths", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("@tanstack/react-start/server-entry")).toBeTruthy();
    });

    it("intercepts @tanstack/start-server-core", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("@tanstack/start-server-core")).toBeTruthy();
    });

    it("intercepts virtual:cloudflare", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("virtual:cloudflare")).toBeTruthy();
    });

    it("intercepts server-entry", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("./server-entry")).toBeTruthy();
    });

    it("intercepts worker-entry", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("./worker-entry")).toBeTruthy();
    });

    it("intercepts routeTree.gen from user code", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("./routeTree.gen", "/Users/me/src/app/router.ts")).toBeTruthy();
    });

    it("does NOT intercept routeTree.gen from node_modules", () => {
      const { resolveId } = createPlugin();
      expect(
        resolveId("./routeTree.gen", "/Users/me/node_modules/@tanstack/router/index.js"),
      ).toBeNull();
    });

    it("intercepts additional server modules", () => {
      const { resolveId } = createPlugin({
        additionalServerModules: ["~/lib/auth/server"],
      });
      expect(resolveId("~/lib/auth/server")).toBeTruthy();
    });

    it("intercepts sub-paths of additional server modules", () => {
      const { resolveId } = createPlugin({
        additionalServerModules: ["~/lib/auth/server"],
      });
      expect(resolveId("~/lib/auth/server/utils")).toBeTruthy();
    });

    it("does NOT intercept unrelated modules", () => {
      const { resolveId } = createPlugin();
      expect(resolveId("react")).toBeNull();
      expect(resolveId("@tanstack/react-router")).toBeNull();
      expect(resolveId("./my-component")).toBeNull();
    });

    it("redirects all intercepted modules to start-stubs", () => {
      const { resolveId } = createPlugin();
      const result = resolveId("@tanstack/react-start");
      expect(result).toContain("start-stubs");
    });
  });

  describe("config", () => {
    it("returns resolve aliases for intercepted modules", () => {
      const { config } = createPlugin();
      const aliases = (config.resolve as Record<string, unknown>).alias as Record<string, string>;
      expect(aliases["@tanstack/react-start"]).toContain("start-stubs");
      expect(aliases["@tanstack/start-server-core"]).toContain("start-stubs");
    });

    it("includes additional server modules in aliases", () => {
      const { config } = createPlugin({
        additionalServerModules: ["~/lib/auth/server"],
      });
      const aliases = (config.resolve as Record<string, unknown>).alias as Record<string, string>;
      expect(aliases["~/lib/auth/server"]).toContain("start-stubs");
    });

    it("excludes TanStack packages from optimizeDeps", () => {
      const { config } = createPlugin();
      const exclude = (config.optimizeDeps as Record<string, unknown>).exclude as string[];
      expect(exclude).toContain("@tanstack/react-start");
      expect(exclude).toContain("@tanstack/start-server-core");
      expect(exclude).toContain("@tanstack/react-router");
    });
  });
});
