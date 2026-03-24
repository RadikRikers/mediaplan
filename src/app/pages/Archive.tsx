import { useStore } from '../store';
import { TaskCard } from '../components/TaskCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { filterTasksByPermissions } from '../utils/permissions';
import { isServiceAccount } from '../constants/serviceAccount';
import { Archive as ArchiveIcon } from 'lucide-react';

export default function Archive() {
  const { users, tasks, channels, currentUser, deleteTask, updateTask } = useStore();

  const archivedTasks = filterTasksByPermissions(
    tasks.filter((t) => Boolean(t.completed)),
    currentUser,
  ).sort((a, b) => {
    if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title, 'ru');
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const handleDelete = (taskId: string) => {
    if (confirm('Удалить задачу из архива?')) {
      deleteTask(taskId);
    }
  };

  const handleRestore = (taskId: string) => {
    updateTask(taskId, { completed: false, completedAt: undefined });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ArchiveIcon className="h-8 w-8" />
          Архив
        </h1>
        <p className="text-gray-600 mt-2">
          Выполненные задачи. Через 2 суток после дедлайна они удаляются автоматически.
        </p>
        {!isServiceAccount(currentUser) && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
            Сохранение данных на устройстве доступно только при входе под{' '}
            <strong>сервисным аккаунтом</strong>. Ваши действия в этой сессии не записываются в постоянное
            хранилище.
          </p>
        )}
      </div>

      {archivedTasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Архив пуст</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Отметьте задачи как выполненные в медиаплане или календаре.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {archivedTasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <TaskCard
                task={task}
                users={users}
                channels={channels}
                archiveMode
                onToggleComplete={() => {}}
                onEdit={() => {}}
                onDelete={handleDelete}
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleRestore(task.id)}>
                  Вернуть в работу
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
