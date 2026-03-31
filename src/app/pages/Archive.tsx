import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { withoutGhostServiceUser } from '../constants/serviceAccount';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { filterTasksByPermissions } from '../utils/permissions';
import { isServiceAccount } from '../constants/serviceAccount';
import { isRemoteSyncConfigured } from '../api/backend';
import { Archive as ArchiveIcon, Search } from 'lucide-react';
import { Task, TaskCategory, categoryLabels } from '../types';

export default function Archive() {
  const {
    users,
    tasks,
    channels,
    currentUser,
    staffBlocks,
    jobPositions,
    deleteTask,
    updateTask,
    addTaskComment,
    savedTaskViews,
    addSavedTaskView,
  } = useStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const usersForUi = useMemo(() => withoutGhostServiceUser(users), [users]);
  const archiveViews = useMemo(
    () => savedTaskViews.filter((v) => v.scope === 'archive'),
    [savedTaskViews],
  );

  const archivedTasks = filterTasksByPermissions(
    tasks.filter((t) => Boolean(t.completed)),
    currentUser,
    users,
    staffBlocks,
  ).sort((a, b) => {
    if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title, 'ru');
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return archivedTasks.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    });
  }, [archivedTasks, search, categoryFilter]);

  const handleDelete = (taskId: string) => {
    if (confirm('Удалить задачу из архива?')) {
      deleteTask(taskId);
    }
  };

  const handleRestore = (taskId: string) => {
    updateTask(taskId, { completed: false, completedAt: undefined });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(tasks.find((t) => t.id === task.id) ?? task);
    setDialogOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    }
    setEditingTask(undefined);
  };

  const saveCurrentView = () => {
    const name = window.prompt('Название представления (архив)', '');
    if (!name?.trim()) return;
    addSavedTaskView({
      name: name.trim(),
      scope: 'archive',
      search,
      categories: categoryFilter === 'all' ? [] : [categoryFilter],
    });
  };

  const applyView = (id: string) => {
    const v = archiveViews.find((x) => x.id === id);
    if (!v) return;
    setSearch(v.search);
    if (v.categories.length === 1) {
      setCategoryFilter(v.categories[0]);
    } else {
      setCategoryFilter('all');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ArchiveIcon className="h-8 w-8" />
          Архив
        </h1>
        <p className="text-muted-foreground mt-2">
          Выполненные задачи. Через месяц после дедлайна и даты выполнения они удаляются из архива автоматически;
          общий счётчик завершённых на дашборде при этом не сбрасывается.
        </p>
        {!isServiceAccount(currentUser) && !isRemoteSyncConfigured() && (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 mt-3">
            Локальное сохранение на устройстве доступно только при входе под{' '}
            <strong>учётной записью с полными правами</strong>. В этой сессии действия могут не сохраняться
            после закрытия вкладки.
          </p>
        )}
      </div>

      {archivedTasks.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск по архиву…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as TaskCategory | 'all')}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {(Object.keys(categoryLabels) as TaskCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {archiveViews.length > 0 && (
            <Select onValueChange={applyView}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Сохранённые виды" />
              </SelectTrigger>
              <SelectContent>
                {archiveViews.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" className="shrink-0" onClick={saveCurrentView}>
            Сохранить вид
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        Показано: {filtered.length} из {archivedTasks.length}
      </p>

      {archivedTasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Архив пуст</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Отметьте задачи как выполненные в медиаплане или календаре.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ничего не найдено</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Измените поиск или фильтр категории.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => (
            <div key={task.id} className="space-y-2">
              <TaskCard
                task={task}
                users={usersForUi}
                channels={channels}
                jobPositions={jobPositions}
                archiveMode
                onToggleComplete={() => {}}
                onEdit={handleEditTask}
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

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        onSave={handleSaveTask}
        users={usersForUi}
        channels={channels}
        jobPositions={jobPositions}
        task={editingTask}
        onAddComment={
          editingTask ? (id, body) => addTaskComment(id, body) : undefined
        }
      />
    </div>
  );
}
