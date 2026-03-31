import { addMonths } from 'date-fns';
import type { Task } from '../types';

/** Дата автоудаления выполненной задачи из архива (не раньше месяца после дедлайна и после отметки «выполнено»). */
export function archivedTaskPurgeAt(task: Pick<Task, 'completedAt' | 'deadline'>): Date {
  const completedAt = task.completedAt ? new Date(task.completedAt) : new Date();
  const purgeAfterDeadline = task.deadline ? addMonths(new Date(task.deadline), 1) : completedAt;
  const purgeAfterComplete = addMonths(completedAt, 1);
  return new Date(Math.max(purgeAfterDeadline.getTime(), purgeAfterComplete.getTime()));
}
