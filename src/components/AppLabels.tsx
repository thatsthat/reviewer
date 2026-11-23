import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#/components/ui/combobox";
import {
  assignLabel,
  createAndAssignLabel,
  unassignLabel,
} from "#/lib/labels.functions";
import {
  createLabelSchema,
  labelNameKey,
  normalizeLabelName,
} from "#/lib/schemas";
import type { LabelOption } from "#/lib/apps.server";

type Option =
  | { kind: "existing"; id: number; name: string; label: string }
  | { kind: "create"; name: string; label: string };

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Please try again.";
}

export function AppLabels({
  appId,
  labels,
  allLabels,
}: {
  appId: number;
  labels: Array<LabelOption>;
  allLabels: Array<LabelOption>;
}) {
  const router = useRouter();
  const callAssign = useServerFn(assignLabel);
  const callCreate = useServerFn(createAndAssignLabel);
  const callUnassign = useServerFn(unassignLabel);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(labels.map((label) => label.id));
  const typedName = normalizeLabelName(inputValue);
  const typedKey = labelNameKey(typedName);

  const options: Array<Option> = allLabels
    .filter((label) => !assignedIds.has(label.id))
    .filter((label) => labelNameKey(label.name).includes(typedKey))
    .map((label) => ({ kind: "existing", ...label, label: label.name }));
  if (typedName && !allLabels.some((label) => labelNameKey(label.name) === typedKey)) {
    options.push({
      kind: "create",
      name: typedName,
      label: `Create "${typedName}"`,
    });
  }

  async function run(action: () => Promise<unknown>) {
    setIsPending(true);
    setError(null);
    try {
      await action();
      await router.invalidate();
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setIsPending(false);
    }
  }

  async function handleSelect(option: Option | null) {
    if (!option) return;
    if (option.kind === "existing") {
      if (await run(() => callAssign({ data: { appId, labelId: option.id } }))) {
        setInputValue("");
      }
      return;
    }
    const parsed = createLabelSchema.safeParse({ appId, name: option.name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid label name.");
      return;
    }
    if (await run(() => callCreate({ data: parsed.data }))) {
      setInputValue("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
          {labels.map((label) => (
            <li key={label.id}>
              <Badge variant="secondary" className="h-6 gap-1 pr-1">
                {label.name}
                <button
                  type="button"
                  aria-label={`Remove label ${label.name}`}
                  disabled={isPending}
                  onClick={() =>
                    run(() => callUnassign({ data: { appId, labelId: label.id } }))
                  }
                  className="rounded-full p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <Combobox<Option | null>
        items={options}
        filter={null}
        value={null}
        inputValue={inputValue}
        onInputValueChange={(value, details) => {
          // Selecting an item makes the combobox rewrite the input; keep what the user typed.
          if (details.reason !== "input-change") return;
          setInputValue(value);
          setError(null);
        }}
        onValueChange={handleSelect}
        itemToStringLabel={(option) => option?.label ?? ""}
        disabled={isPending}
      >
        <ComboboxInput
          placeholder="Add a label…"
          aria-label="Add a label"
          aria-invalid={error ? true : undefined}
          className="max-w-xs"
        />
        <ComboboxContent>
          <ComboboxEmpty>No labels to add</ComboboxEmpty>
          <ComboboxList>
            {(option: Option) => (
              <ComboboxItem
                key={option.kind === "existing" ? option.id : "create"}
                value={option}
              >
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
