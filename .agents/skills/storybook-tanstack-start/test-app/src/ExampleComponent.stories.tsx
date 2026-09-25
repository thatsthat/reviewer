import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, userEvent } from "storybook/test";
import { ExampleComponent } from "./ExampleComponent.js";

const meta = {
  title: "ExampleComponent",
  component: ExampleComponent,
  args: {
    name: "World",
  },
} satisfies Meta<typeof ExampleComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /fetch greeting/i });
    await userEvent.click(button);
    // The stub throws "createServerFn not available in Storybook"
    const error = await canvas.findByTestId("error");
    await expect(error).toHaveTextContent("createServerFn not available in Storybook");
  },
};
