# storybook-addon-tanstack-start

Storybook addon for TanStack Start. One package that gives you everything: a Vite plugin to stub server-side imports, router context decorator, and route parameter helpers. Includes [`storybook-addon-tanstack-router`](https://github.com/jonmumm/storybook-addon-tanstack-router) as a dependency — no need to install it separately.

## Installation

```bash
pnpm add -D storybook-addon-tanstack-start
```

### AI Agent Skill

Install as an agent skill for guided setup:

```bash
npx skills add jonmumm/storybook-addon-tanstack-start
```

## Setup

### 1. Add the Vite plugin to your Storybook config

```ts
// .storybook/main.ts
import { tanstackStartPlugin } from "storybook-addon-tanstack-start/plugin";
import { mergeConfig } from "vite";

const config = {
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tanstackStartPlugin()],
    });
  },
};
```

### 2. Add the router decorator

```ts
// .storybook/preview.ts
export { decorators } from "storybook-addon-tanstack-start/preview";
```

### 3. Use in stories

```tsx
import { tanstackRouterParameters } from "storybook-addon-tanstack-start";

export default {
  title: "MyComponent",
  parameters: {
    tanstackRouter: tanstackRouterParameters({
      location: {
        path: "/users/$userId",
        params: { userId: "42" },
      },
      loader: { data: { user: { name: "Alice" } } },
    }),
  },
};
```

## Plugin Options

```ts
tanstackStartPlugin({
  // Additional module IDs to redirect to stubs
  additionalServerModules: ["~/lib/auth/server", "~/lib/billing/server"],

  // Keep TanStack Vite plugins in the pipeline (default: true removes them)
  stripTanStackPlugins: false,
});
```

## What Gets Stubbed

The plugin intercepts and stubs:

- `@tanstack/react-start` and all sub-paths
- `@tanstack/start-server-core`
- Server/worker entry points (`server-entry`, `worker-entry`, `virtual:cloudflare`)
- `routeTree.gen` (when not from node_modules)
- Any modules listed in `additionalServerModules`

Stubs include: `createServerFn` (chainable builder with `validator`, `inputValidator`, `middleware`, `method`, `handler`), `createStart`, cookie helpers (`setCookie`, `getCookie`, `deleteCookie`, `clearCookieStore`), router hook stubs (`useLoaderData`, `useParams`, `useSearch`, `useNavigate`, `useMatch`, `useMatches`, `useRouter`, `useLocation`, `useRouteContext`), component stubs, and a mock server entry.

## Plugin Stripping

By default, the plugin removes TanStack Router/Start and Nitro Vite plugins from the pipeline. These plugins inject server entries (like `default-entry/client.tsx`) that import from `@tanstack/react-start` — which resolve to our stubs, then the plugin tries to load sub-paths of the stub as files, breaking the build.

Set `stripTanStackPlugins: false` if you need to keep them (not recommended).

## Double RouterProvider Warning

If you already wrap stories in a custom `withRouter()` decorator, don't also use `withTanStackRouter` globally — you'll get nested providers. Either remove your custom decorator or skip the global one.

## License

MIT
