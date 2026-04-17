import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    status: z.enum(['todo', 'in-progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    status: z.enum(['todo', 'in-progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const getTasksSchema = z.object({
  query: z.object({
    status: z.enum(['todo', 'in-progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const assignTaskSchema = z.object({
  body: z.object({
    assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
});
