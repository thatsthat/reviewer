import { createServerFn } from '@tanstack/react-start'
import { assignLabelSchema, createLabelSchema, unassignLabelSchema } from '#/lib/schemas'
import {
  assignLabel as saveAssignment,
  createAndAssignLabel as saveNewLabel,
  unassignLabel as removeAssignment,
} from '#/lib/labels.server'

export const assignLabel = createServerFn({ method: 'POST' })
  .validator(assignLabelSchema)
  .handler(({ data }) => saveAssignment(data.appId, data.labelId))

export const createAndAssignLabel = createServerFn({ method: 'POST' })
  .validator(createLabelSchema)
  .handler(({ data }) => saveNewLabel(data.appId, data.name))

export const unassignLabel = createServerFn({ method: 'POST' })
  .validator(unassignLabelSchema)
  .handler(({ data }) => removeAssignment(data.appId, data.labelId))
