// @ts-nocheck — This file uses TanStack Start's runtime API which differs
// from its published types. In a real project, the plugin stubs these imports
// before type checking sees them.
import React from "react";
import { createServerFn } from "@tanstack/react-start";

// This server function import would crash without the plugin stubbing it
const getGreeting = createServerFn()
  .validator((name: string) => name)
  .handler(async ({ data }) => {
    return `Hello, ${data}!`;
  });

export function ExampleComponent({ name }: { name: string }) {
  const [greeting, setGreeting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    try {
      const result = await (getGreeting as unknown as (input: string) => Promise<string>)(name);
      setGreeting(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div>
      <h1>TanStack Start Component</h1>
      <p>Name: {name}</p>
      <button onClick={handleClick}>Fetch Greeting</button>
      {greeting && <p data-testid="greeting">{greeting}</p>}
      {error && <p data-testid="error">{error}</p>}
    </div>
  );
}
