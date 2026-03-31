import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { withoutGhostServiceUser } from '../constants/serviceAccount';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Search, LayoutTemplate, ListChecks, ListX } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, TaskCategory, TaskTemplate, categoryLabels } from '../types';
import { filterTasksByPermissions } from '../utils/permissions';
import { toast } from 'sonner';

export default function MediaPlan() {
  const {
    users,
    tasks,
    channels,
    currentUser,
    staffBlocks,
    jobPositions,
    addTask,
    updateTask,
    deleteTask,
    getTasksForDate,
    addTaskComment,
    taskTemplates,
    addTaskTemplate,
    removeTaskTemplate,
    savedTaskViews,
    addSavedTaskView,
    removeSavedTaskView,
    bulkShiftDeadlines,
    bulkAddAssignee,
  } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkUserId, setBulkUserId] = useState<string>('');

  const usersForUi = useMemo(() => withoutGhostServiceUser(users), [users]);
  const mediaplanViews = useMemo(
    () => savedTaskViews.filter((v) => v.scope === 'mediaplan'),
    [savedTaskViews],
  );

  const allTasksForDate = getTasksForDate(selectedDate);
  const tasksForDate = filterTasksByPermissions(allTasksForDate, currentUser, users, staffBlocks);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasksForDate;
    return tasksForDate.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [tasksForDate, search]);

  const getTasksByCategory = (category: TaskCategory) =>
    filteredTasks.filter((t) => t.category === category);

  const toggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const clearBulk = () => {
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setEditingTask(undefined);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(tasks.find((t) => t.id === task.id) ?? task);
    setDialogOpen(true);
  };

  const handleToggleComplete = (taskId: string, completed: boolean) => {
    if (completed) {
      updateTask(taskId, { completed: true, completedAt: new Date().toISOString() });
    } else {
      updateTask(taskId, { completed: false, completedAt: undefined });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
      deleteTask(taskId);
    }
  };

  const handleOpenDialog = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const saveCurrentView = () => {
    const name = window.prompt('Название представления', '');
    if (!name?.trim()) return;
    addSavedTaskView({
      name: name.trim(),
      scope: 'mediaplan',
      search,
      categories: [],
    });
    toast.success('Представление сохранено (синхронизируется с облаком)');
  };

  const applyView = (id: string) => {
    const v = mediaplanViews.find((x) => x.id === id);
    if (!v) return;
    setSearch(v.search);
  };

  const createFromTemplate = (templateId: string) => {
    const tpl = taskTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setEditingTask({
      ...tpl.draft,
      id: '__draft__',
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: undefined,
      comments: [],
      activity: [],
    } as Task);
    setDialogOpen(true);
  };

  const saveDialogAsTemplate = () => {
    if (!editingTask?.id || editingTask.id === '__draft__') {
      toast.error('Сначала сохраните задачу, затем откройте её снова для шаблона');
      return;
    }
    const t = tasks.find((x) => x.id === editingTask.id);
    if (!t) return;
    const name = window.prompt('Название шаблона', t.title);
    if (!name?.trim()) return;
    const draft: TaskTemplate['draft'] = {
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      assignees: t.assignees,
      category: t.category,
      recurrence: t.recurrence,
      dayOfWeek: t.dayOfWeek,
      dayOfMonth: t.dayOfMonth,
      monthOfQuarter: t.monthOfQuarter,
      dayOfQuarter: t.dayOfQuarter,
      kpiType: t.kpiType,
      kpiTarget: t.kpiTarget,
      channels: t.channels,
      socialPlatform: t.socialPlatform,
    };
    addTaskTemplate(name.trim(), draft);
    toast.success('Шаблон добавлен');
  };

  const categories: TaskCategory[] = ['federal', 'regional', 'pfo', 'spk-mailings', 'bloggers', 'reports'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Медиаплан</h1>
          <p className="text-muted-foreground mt-2">Планирование и управление задачами</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={bulkMode ? 'secondary' : 'outline'} size="sm" onClick={() => setBulkMode((m) => !m)}>
            <ListChecks className="h-4 w-4 mr-1" />
            {bulkMode ? 'Закончить выбор' : 'Массовый выбор'}
          </Button>
          <Button variant="outline" size="sm" onClick={saveCurrentView}>
            Сохранить вид
          </Button>
          <Button onClick={handleOpenDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Задача
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по названию и описанию…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {mediaplanViews.length > 0 && (
          <Select onValueChange={applyView}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Сохранённые виды" />
            </SelectTrigger>
            <SelectContent>
              {mediaplanViews.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {taskTemplates.length > 0 && (
          <Select onValueChange={createFromTemplate}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Из шаблона" />
            </SelectTrigger>
            <SelectContent>
              {taskTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {bulkMode && selectedIds.size > 0 && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="py-3 flex flex-wrap items-center gap-2 text-sm">
            <span>Выбрано: {selectedIds.size}</span>
            <Button size="sm" variant="outline" onClick={() => bulkShiftDeadlines([...selectedIds], -7)}>
              −7 дн.
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkShiftDeadlines([...selectedIds], 7)}>
              +7 дн.
            </Button>
            <Select value={bulkUserId || '_'} onValueChange={(v) => setBulkUserId(v === '_' ? '' : v)}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Добавить исполнителя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {usersForUi.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!bulkUserId}
              onClick={() => {
                bulkAddAssignee([...selectedIds], bulkUserId);
                toast.success('Исполнители обновлены');
              }}
            >
              Добавить в задачи
            </Button>
            <Button size="sm" variant="ghost" onClick={clearBulk}>
              <ListX className="h-4 w-4 mr-1" />
              Снять
            </Button>
          </CardContent>
        </Card>
      )}

      {taskTemplates.length > 0 && (
        <details className="mb-4 text-sm text-muted-foreground">
          <summary className="cursor-pointer">Управление шаблонами</summary>
          <ul className="mt-2 space-y-1">
            {taskTemplates.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
                {t.name}
                <Button variant="link" className="h-auto p-0 text-destructive" onClick={() => removeTaskTemplate(t.id)}>
                  Удалить
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Выбор даты</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ru}
              className="rounded-md border"
            />
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                {filteredTasks.length} из {tasksForDate.length} задач
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Tabs defaultValue="federal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="text-xs sm:text-sm px-2 py-2 whitespace-normal h-auto min-h-[2.5rem]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-center leading-tight">{categoryLabels[category]}</span>
                    <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">
                      {getTasksByCategory(category).length}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getTasksByCategory(category).map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          users={usersForUi}
                          channels={channels}
                          jobPositions={jobPositions}
                          onToggleComplete={handleToggleComplete}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          selectionMode={bulkMode}
                          selected={selectedIds.has(task.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                      {getTasksByCategory(category).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>Нет задач в этой категории</p>
                          <Button variant="outline" className="mt-4" onClick={handleOpenDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Создать задачу
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

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
          editingTask && editingTask.id !== '__draft__' ? (id, body) => addTaskComment(id, body) : undefined
        }
        onSaveAsTemplate={
          editingTask && editingTask.id !== '__draft__' ? saveDialogAsTemplate : undefined
        }
      />
    </div>
  );
}
