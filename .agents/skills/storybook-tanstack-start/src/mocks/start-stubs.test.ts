import { describe, expect, it } from "vitest";
import {
  Link,
  Navigate,
  Outlet,
  HeadContent,
  Scripts,
  createFileRoute,
  createRootRoute,
  createRouter,
  createServerFn,
  createStart,
  deleteCookie,
  getCookie,
  getRouter,
  notFound,
  routeTree,
  setCookie,
  useNavigate,
  useSearch,
} from "./start-stubs.js";

describe("createServerFn", () => {
  it("returns a chainable builder", () => {
    const builder = createServerFn();
    expect(builder).toHaveProperty("validator");
    expect(builder).toHaveProperty("handler");
  });

  it("supports chaining validator().handler()", () => {
    const builder = createServerFn();
    const chained = (builder as { validator: () => typeof builder }).validator();
    expect(chained).toBe(builder);
  });

  it("supports chaining inputValidator().handler()", () => {
    const builder = createServerFn();
    const chained = (builder as { inputValidator: () => typeof builder }).inputValidator();
    expect(chained).toBe(builder);
  });

  it("handler returns an async function that throws", async () => {
    const builder = createServerFn();
    const handler = (builder as { handler: () => () => Promise<void> }).handler;
    const fn = handler();
    await expect(fn()).rejects.toThrow("createServerFn not available");
  });
});

describe("createStart", () => {
  it("returns an empty object", () => {
    expect(createStart()).toEqual({});
  });
});

describe("cookie helpers", () => {
  it("setCookie and getCookie work together", () => {
    setCookie("token", "abc123");
    expect(getCookie("token")).toBe("abc123");
  });

  it("deleteCookie removes a cookie", () => {
    setCookie("session", "xyz");
    deleteCookie("session");
    expect(getCookie("session")).toBeUndefined();
  });

  it("getCookie returns undefined for missing cookies", () => {
    expect(getCookie("nonexistent")).toBeUndefined();
  });
});

describe("routeTree", () => {
  it("has root route properties", () => {
    expect(routeTree.id).toBe("__root__");
    expect(routeTree.path).toBe("/");
    expect(routeTree.fullPath).toBe("/");
  });

  it("has an init function", () => {
    expect(typeof routeTree.init).toBe("function");
  });
});

describe("createRouter", () => {
  it("returns a router with navigate and state", () => {
    const router = createRouter();
    expect(router).toHaveProperty("navigate");
    expect(router.state).toEqual({
      location: { pathname: "/", search: "", hash: "" },
    });
  });
});

describe("createRootRoute", () => {
  it("merges config with root route defaults", () => {
    const route = createRootRoute({ component: () => null });
    expect(route.id).toBe("__root__");
    expect(route.path).toBe("/");
    expect(typeof route.init).toBe("function");
  });
});

describe("createFileRoute", () => {
  it("returns a factory that creates a route with the given path", () => {
    const route = createFileRoute("/about")({ component: () => null });
    expect(route.id).toBe("/about");
    expect(route.path).toBe("/about");
    expect(typeof route.init).toBe("function");
  });
});

describe("useNavigate", () => {
  it("returns a function", () => {
    expect(typeof useNavigate()).toBe("function");
  });
});

describe("useSearch", () => {
  it("returns an empty object", () => {
    expect(useSearch()).toEqual({});
  });
});

describe("component stubs", () => {
  it("Outlet returns null", () => {
    expect(Outlet()).toBeNull();
  });

  it("HeadContent returns null", () => {
    expect(HeadContent()).toBeNull();
  });

  it("Scripts returns null", () => {
    expect(Scripts()).toBeNull();
  });

  it("Navigate returns null", () => {
    expect(Navigate()).toBeNull();
  });
});

describe("Link", () => {
  it("is defined as a function", () => {
    expect(typeof Link).toBe("function");
  });
});

describe("notFound", () => {
  it("throws an error", () => {
    expect(() => notFound()).toThrow("Not found");
  });
});

describe("getRouter", () => {
  it("returns a router with the stub routeTree", () => {
    const router = getRouter();
    expect(router).toHaveProperty("navigate");
    expect(router).toHaveProperty("routeTree");
  });
});
