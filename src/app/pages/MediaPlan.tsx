import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { withoutGhostServiceUser } from '../constants/serviceAccount';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task, TaskCategory, categoryLabels } from '../types';
import { filterTasksByPermissions } from '../utils/permissions';

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
  } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const usersForUi = useMemo(() => withoutGhostServiceUser(users), [users]);

  // Фильтруем задачи по правам доступа
  const allTasksForDate = getTasksForDate(selectedDate);
  const tasksForDate = filterTasksByPermissions(allTasksForDate, currentUser, users, staffBlocks);

  const getTasksByCategory = (category: TaskCategory) => {
    return tasksForDate.filter(t => t.category === category);
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
    setEditingTask(task);
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

  const categories: TaskCategory[] = ['federal', 'regional', 'pfo', 'spk-mailings', 'bloggers', 'reports'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Медиаплан</h1>
          <p className="text-gray-600 mt-2">Планирование и управление задачами</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Создать задачу
        </Button>
      </div>

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
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {tasksForDate.length} задач
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Tabs defaultValue="federal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="text-xs sm:text-sm px-2 py-2 whitespace-normal h-auto min-h-[2.5rem]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-center leading-tight">
                      {categoryLabels[category]}
                    </span>
                    <span className="text-xs bg-gray-200 rounded-full px-1.5 py-0.5">
                      {getTasksByCategory(category).length}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getTasksByCategory(category).map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          users={usersForUi}
                          channels={channels}
                          jobPositions={jobPositions}
                          onToggleComplete={handleToggleComplete}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                      {getTasksByCategory(category).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <p>Нет задач в этой категории</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={handleOpenDialog}
                          >
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
      />
    </div>
  );
}