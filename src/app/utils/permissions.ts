import { User, Task, UserRole, roleBlocks } from '../types';

// Проверяет, имеет ли пользователь полный доступ ко всем данным
export function hasFullAccess(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'editor' || user.role === 'senior-smm-specialist';
}

// Получает блок пользователя (SMM, копирайтинг, контент)
export function getUserBlock(role: UserRole): 'smm' | 'copywriting' | 'content' | null {
  if (roleBlocks.smm.includes(role)) return 'smm';
  if (roleBlocks.copywriting.includes(role)) return 'copywriting';
  if (roleBlocks.content.includes(role)) return 'content';
  return null;
}

// Проверяет, может ли пользователь видеть задачу
export function canViewTask(task: Task, currentUser: User | null): boolean {
  if (!currentUser) return false;
  
  // Редактор и старший SMM видят все задачи
  if (hasFullAccess(currentUser)) return true;
  
  // Пользователь видит только свои задачи
  return task.assignees.includes(currentUser.id);
}

// Фильтрует задачи по правам доступа
export function filterTasksByPermissions(tasks: Task[], currentUser: User | null): Task[] {
  if (!currentUser) return [];
  return tasks.filter(task => canViewTask(task, currentUser));
}

// Проверяет, может ли пользователь видеть другого пользователя (для дашборда)
export function canViewUser(user: User, currentUser: User | null): boolean {
  if (!currentUser) return false;
  
  // Редактор и старший SMM видят всех
  if (hasFullAccess(currentUser)) return true;
  
  // Пользователь видит только пользователей своего блока
  const currentUserBlock = getUserBlock(currentUser.role);
  const targetUserBlock = getUserBlock(user.role);
  
  return currentUserBlock === targetUserBlock;
}

// Фильтрует пользователей по правам доступа
export function filterUsersByPermissions(users: User[], currentUser: User | null): User[] {
  if (!currentUser) return [];
  return users.filter(user => canViewUser(user, currentUser));
}
