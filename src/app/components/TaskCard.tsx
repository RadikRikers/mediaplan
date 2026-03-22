import { Task, User, CommunicationChannel, roleLabels, categoryLabels, recurrenceLabels } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { format, isBefore, addDays, differenceInCalendarDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, Repeat, TrendingUp, Link as LinkIcon, Eye, Edit, Trash2, MessageSquare } from 'lucide-react';
import { cn } from './ui/utils';

interface TaskCardProps {
  task: Task;
  users: User[];
  channels: CommunicationChannel[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  /** Только просмотр выполненной задачи в архиве */
  archiveMode?: boolean;
}

export function TaskCard({ task, users, channels, onToggleComplete, onEdit, onDelete, archiveMode }: TaskCardProps) {
  const isOverdue = !task.completed && isBefore(new Date(task.deadline), new Date());
  const assignedUsers = users.filter(u => task.assignees.includes(u.id));
  const taskChannels = channels.filter(c => task.channels?.includes(c.id));

  const getRecurrenceDetails = () => {
    if (task.recurrence === 'none') return null;
    
    const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    if (task.recurrence === 'weekly' || task.recurrence === 'biweekly') {
      return task.dayOfWeek !== undefined ? `${weekDays[task.dayOfWeek]}` : '';
    }
    if (task.recurrence === 'monthly') {
      return task.dayOfMonth ? `${task.dayOfMonth} число` : '';
    }
    if (task.recurrence === 'quarterly') {
      return task.monthOfQuarter && task.dayOfQuarter 
        ? `${task.monthOfQuarter} мес., ${task.dayOfQuarter} число` 
        : '';
    }
    return '';
  };

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        isOverdue && 'bg-red-50/50 border-red-200'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={task.completed}
              disabled={archiveMode}
              onCheckedChange={(checked) => {
                if (archiveMode) return;
                const next = checked === true;
                if (next && !task.completed) {
                  if (
                    !window.confirm(
                      'Подтвердите, что задача действительно выполнена. Она будет перенесена в архив.',
                    )
                  ) {
                    return;
                  }
                  onToggleComplete(task.id, true);
                  return;
                }
                if (!next && task.completed) {
                  onToggleComplete(task.id, false);
                }
              }}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className={cn('text-base', task.completed && 'line-through text-gray-500')}>
                {task.title}
              </CardTitle>
              <Badge variant="outline" className="mt-1">
                {categoryLabels[task.category]}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            {!archiveMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-gray-600">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-sm">
          <div className={cn('flex items-center gap-1', isOverdue && 'text-red-600 font-medium')}>
            <Clock className="h-4 w-4" />
            <span>{format(new Date(task.deadline), 'dd MMM yyyy, HH:mm', { locale: ru })}</span>
          </div>

          {task.recurrence !== 'none' && (
            <div className="flex items-center gap-1 text-blue-600">
              <Repeat className="h-4 w-4" />
              <span>
                {recurrenceLabels[task.recurrence]}
                {getRecurrenceDetails() && ` (${getRecurrenceDetails()})`}
              </span>
            </div>
          )}

          {task.kpiType !== 'none' && task.kpiTarget && (
            <div className="flex items-center gap-1 text-purple-600">
              {task.kpiType === 'views' ? <Eye className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              <TrendingUp className="h-3 w-3" />
              <span>{task.kpiTarget.toLocaleString()}</span>
            </div>
          )}
        </div>

        {taskChannels.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              <span>Каналы:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {taskChannels.map(channel => (
                <Badge key={channel.id} variant="outline" className="text-xs">
                  {channel.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {assignedUsers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Ответственные:</p>
            <div className="flex flex-wrap gap-1">
              {assignedUsers.map(user => (
                <Badge key={user.id} variant="secondary" className="text-xs">
                  {user.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {archiveMode && task.completed && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            Автоудаление из архива: через 2 дня после дедлайна (
            {format(addDays(new Date(task.deadline), 2), 'dd.MM.yyyy HH:mm', { locale: ru })}
            ). Осталось примерно{' '}
            {Math.max(0, differenceInCalendarDays(addDays(new Date(task.deadline), 2), new Date()))} сут.
          </p>
        )}
      </CardContent>
    </Card>
  );
}