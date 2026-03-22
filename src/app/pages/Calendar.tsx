import { useState } from 'react';
import { useStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { TaskCard } from '../components/TaskCard';
import { TaskDialog } from '../components/TaskDialog';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '../types';
import { filterTasksByPermissions } from '../utils/permissions';

export default function Calendar() {
  const { users, tasks, channels, currentUser, addTask, updateTask, deleteTask, getTasksForDate } = useStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Фильтруем задачи по правам доступа
  const allTasksForDate = getTasksForDate(selectedDate);
  const tasksForDate = filterTasksByPermissions(allTasksForDate, currentUser);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Календарь</h1>
          <p className="text-gray-600 mt-2">Просмотр задач по датам</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Создать задачу
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Выбор даты</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ru}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Задачи на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasksForDate.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>На эту дату задач нет</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleOpenDialog}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Создать задачу
                  </Button>
                </div>
              ) : (
                tasksForDate.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    channels={channels}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        onSave={handleSaveTask}
        users={users}
        channels={channels}
        task={editingTask}
      />
    </div>
  );
}
