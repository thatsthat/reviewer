import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { prisma } from '../db';

export const Route = createFileRoute('/')({
  component: App,
  loader: () => getTodos(),
});

const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
  return prisma.todo.findMany();
});

function App() {
  const todos = Route.useLoaderData();

  return (
    <div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
