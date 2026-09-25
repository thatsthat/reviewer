import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TanStackStartPluginOptions {
  /** Additional module IDs to redirect to stubs (e.g. '~/lib/auth/server') */
  additionalServerModules?: string[];
}

const INTERCEPTED_MODULES = ["@tanstack/react-start", "@tanstack/start-server-core"];

const INTERCEPTED_PATTERNS = ["virtual:cloudflare", "server-entry", "worker-entry"];

export function tanstackStartPlugin(options: TanStackStartPluginOptions = {}): Plugin {
  const { additionalServerModules = [] } = options;
  const stubPath = path.resolve(__dirname, "mocks", "start-stubs.mjs");

  return {
    name: "storybook-tanstack-start",
    enforce: "pre",

    resolveId(id: string, importer: string | undefined) {
      // Intercept TanStack Start packages and sub-paths
      for (const mod of INTERCEPTED_MODULES) {
        if (id === mod || id.startsWith(`${mod}/`)) {
          return stubPath;
        }
      }

      // Intercept virtual/server/worker entries
      for (const pattern of INTERCEPTED_PATTERNS) {
        if (id.includes(pattern)) {
          return stubPath;
        }
      }

      // Intercept routeTree.gen (only when not from node_modules)
      if (id.includes("routeTree.gen") && (!importer || !importer.includes("node_modules"))) {
        return stubPath;
      }

      // Intercept additional server modules
      for (const mod of additionalServerModules) {
        if (id === mod || id.startsWith(`${mod}/`)) {
          return stubPath;
        }
      }

      return null;
    },

    config() {
      const aliasEntries: Record<string, string> = {};
      for (const mod of INTERCEPTED_MODULES) {
        aliasEntries[mod] = stubPath;
      }
      for (const mod of additionalServerModules) {
        aliasEntries[mod] = stubPath;
      }

      return {
        resolve: {
          alias: aliasEntries,
        },
        optimizeDeps: {
          exclude: [
            "@tanstack/react-start",
            "@tanstack/start-server-core",
            "@tanstack/react-router",
          ],
        },
      };
    },
  };
}
