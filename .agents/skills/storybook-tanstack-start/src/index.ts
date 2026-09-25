// Export the Vite plugin
export { tanstackStartPlugin } from "./plugin.js";
export type { TanStackStartPluginOptions } from "./plugin.js";

// Re-export everything from storybook-addon-tanstack-router
// so users only need one package
export { withTanStackRouter, tanstackRouterParameters } from "storybook-addon-tanstack-router";
export type {
  TanStackRouterParameters,
  LocationConfig,
  LoaderConfig,
} from "storybook-addon-tanstack-router";

// Re-export stubs for direct use
export {
  clearCookieStore,
  createFileRoute,
  createRootRoute,
  createRootRouteWithContext,
  createRouter,
  createServerFn,
  createStart,
  deleteCookie,
  getCookie,
  getRouter,
  HeadContent,
  Link,
  Navigate,
  notFound,
  Outlet,
  redirect,
  routeTree,
  Scripts,
  setCookie,
  useLoaderData,
  useLocation,
  useMatch,
  useMatches,
  useNavigate,
  useParams,
  useRouteContext,
  useRouter,
  useSearch,
} from "./mocks/start-stubs.js";
