import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Task,
  User,
  CommunicationChannel,
  JobPosition,
  TaskCategory,
  RecurrenceType,
  KPIType,
  categoryLabels,
  recurrenceLabels,
  displayTaskTypeLabel,
} from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { withoutGhostServiceUser, SERVICE_USER_ID } from '../constants/serviceAccount';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  users: User[];
  channels: CommunicationChannel[];
  jobPositions?: JobPosition[];
  task?: Task;
  /** Для существующей задачи: добавить комментарий (сохраняется в payload). */
  onAddComment?: (taskId: string, body: string) => void;
  /** Сохранить текущую задачу как шаблон (родитель сам показывает prompt и вызывает store). */
  onSaveAsTemplate?: () => void;
}

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  users,
  channels,
  jobPositions = [],
  task,
  onAddComment,
  onSaveAsTemplate,
}: TaskDialogProps) {
  /** Существующая задача в БД (не черновик из шаблона с id `__draft__`). */
  const isExistingTask = Boolean(task?.id && task.id !== '__draft__');
  const assigneePickerUsers = useMemo(() => withoutGhostServiceUser(users), [users]);
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [deadline, setDeadline] = useState(
    task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''
  );
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'federal');
  const [assignees, setAssignees] = useState<string[]>(task?.assignees || []);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(task?.channels || []);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'none');
  const [dayOfWeek, setDayOfWeek] = useState(task?.dayOfWeek?.toString() || '1');
  const [dayOfMonth, setDayOfMonth] = useState(task?.dayOfMonth?.toString() || '1');
  const [monthOfQuarter, setMonthOfQuarter] = useState(task?.monthOfQuarter?.toString() || '1');
  const [dayOfQuarter, setDayOfQuarter] = useState(task?.dayOfQuarter?.toString() || '1');
  const [kpiType, setKpiType] = useState<KPIType>(task?.kpiType || 'none');
  const [kpiTarget, setKpiTarget] = useState(task?.kpiTarget?.toString() || '');
  const [withoutDeadline, setWithoutDeadline] = useState(!task?.deadline);
  const [dialogTab, setDialogTab] = useState('main');
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setDeadline(task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
    setCategory(task?.category || 'federal');
    setAssignees((task?.assignees || []).filter((id) => id !== SERVICE_USER_ID));
    setSelectedChannels(task?.channels || []);
    setRecurrence(task?.recurrence || 'none');
    setDayOfWeek(task?.dayOfWeek?.toString() || '1');
    setDayOfMonth(task?.dayOfMonth?.toString() || '1');
    setMonthOfQuarter(task?.monthOfQuarter?.toString() || '1');
    setDayOfQuarter(task?.dayOfQuarter?.toString() || '1');
    setKpiType(task?.kpiType || 'none');
    setKpiTarget(task?.kpiTarget?.toString() || '');
    setWithoutDeadline(!task?.deadline);
    setDialogTab('main');
    setCommentDraft('');
  }, [open, task]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Укажите название задачи');
      return;
    }

    const assigneesClean = assignees.filter((id) => id !== SERVICE_USER_ID);
    if (assigneesClean.length === 0) {
      toast.error('Выберите хотя бы одного ответственного');
      return;
    }

    if (!withoutDeadline && !deadline) {
      toast.error('Укажите дедлайн или отметьте «Без дедлайна»');
      return;
    }
    const taskData: Omit<Task, 'id' | 'createdAt'> = {
      title: title.trim(),
      description: description.trim(),
      deadline: withoutDeadline ? undefined : new Date(deadline).toISOString(),
      category,
      assignees: assigneesClean,
      recurrence: withoutDeadline ? 'none' : recurrence,
      completed: isExistingTask ? task?.completed || false : false,
      completedAt: isExistingTask ? task?.completedAt : undefined,
      kpiType,
      kpiTarget: kpiType !== 'none' && kpiTarget ? parseInt(kpiTarget, 10) : undefined,
      channels: selectedChannels,
      socialPlatform: category === 'bloggers' ? task?.socialPlatform : undefined,
    };

    // Добавляем специфичные поля для повторений
    if (recurrence === 'weekly' || recurrence === 'biweekly') {
      taskData.dayOfWeek = parseInt(dayOfWeek, 10);
    } else if (recurrence === 'monthly') {
      taskData.dayOfMonth = parseInt(dayOfMonth, 10);
    } else if (recurrence === 'quarterly') {
      taskData.monthOfQuarter = parseInt(monthOfQuarter, 10);
      taskData.dayOfQuarter = parseInt(dayOfQuarter, 10);
    }

    onSave(taskData);

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setCategory('federal');
    setAssignees([]);
    setSelectedChannels([]);
    setRecurrence('none');
    setDayOfWeek('1');
    setDayOfMonth('1');
    setMonthOfQuarter('1');
    setDayOfQuarter('1');
    setKpiType('none');
    setKpiTarget('');
    setWithoutDeadline(false);
  };

  const toggleAssignee = (userId: string) => {
    setAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const weekDays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isExistingTask ? 'Редактировать задачу' : 'Создать задачу'}</DialogTitle>
          <DialogDescription>
            Заполните информацию о задаче
          </DialogDescription>
        </DialogHeader>

        <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="main">Поля</TabsTrigger>
            <TabsTrigger value="comments" disabled={!isExistingTask}>
              Комментарии
            </TabsTrigger>
            <TabsTrigger value="history" disabled={!isExistingTask}>
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название задачи"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание задачи"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Дедлайн</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={withoutDeadline}
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <Checkbox
                  checked={withoutDeadline}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setWithoutDeadline(next);
                    if (next) setDeadline('');
                  }}
                />
                Без дедлайна
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Повторение</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(recurrenceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Настройки повторения */}
          {(recurrence === 'weekly' || recurrence === 'biweekly') && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">День недели</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrence === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">День месяца</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day} число
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrence === 'quarterly' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthOfQuarter">Месяц квартала</Label>
                <Select value={monthOfQuarter} onValueChange={setMonthOfQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-й месяц</SelectItem>
                    <SelectItem value="2">2-й месяц</SelectItem>
                    <SelectItem value="3">3-й месяц</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayOfQuarter">День месяца</Label>
                <Select value={dayOfQuarter} onValueChange={setDayOfQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day} число
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ответственные *</Label>
            <div className="border rounded-md p-4 space-y-3 max-h-48 overflow-y-auto">
              {assigneePickerUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={assignees.includes(user.id)}
                    onCheckedChange={() => toggleAssignee(user.id)}
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {user.name} ({displayTaskTypeLabel(user, jobPositions)})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Каналы коммуникации</Label>
            <div className="border rounded-md p-4 space-y-3 max-h-40 overflow-y-auto">
              {channels.map(channel => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel.id}`}
                    checked={selectedChannels.includes(channel.id)}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                  <label
                    htmlFor={`channel-${channel.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {channel.name}
                  </label>
                </div>
              ))}
              {channels.length === 0 && (
                <p className="text-sm text-gray-500">Нет доступных каналов</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kpi">KPI</Label>
            <Select value={kpiType} onValueChange={(v) => setKpiType(v as KPIType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без KPI</SelectItem>
                <SelectItem value="views">По просмотрам</SelectItem>
                <SelectItem value="links">По ссылкам</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kpiType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="kpiTarget">
                Цель {kpiType === 'views' ? 'просмотров' : 'ссылок'}
              </Label>
              <Input
                id="kpiTarget"
                type="number"
                value={kpiTarget}
                onChange={(e) => setKpiTarget(e.target.value)}
                placeholder="Введите число (до 9999999)"
                min="0"
                max="9999999"
              />
            </div>
          )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 py-2 min-h-[12rem]">
            <div className="rounded-md border max-h-48 overflow-y-auto p-2 space-y-2 text-sm">
              {(task?.comments ?? []).length === 0 ? (
                <p className="text-muted-foreground">Комментариев пока нет.</p>
              ) : (
                (task?.comments ?? []).map((c) => (
                  <div key={c.id} className="border-b border-border/60 pb-2 last:border-0">
                    <div className="text-xs text-muted-foreground">
                      {assigneePickerUsers.find((u) => u.id === c.authorUserId)?.name ?? c.authorUserId} ·{' '}
                      {format(new Date(c.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </div>
                    <p className="whitespace-pre-wrap mt-1">{c.body}</p>
                  </div>
                ))
              )}
            </div>
            {onAddComment && isExistingTask && task?.id ? (
              <div className="space-y-2">
                <Label>Новый комментарий</Label>
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Текст…"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const t = commentDraft.trim();
                    if (!t) return;
                    onAddComment(task!.id, t);
                    setCommentDraft('');
                    toast.success('Комментарий добавлен');
                  }}
                >
                  Добавить
                </Button>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 py-2 min-h-[12rem] max-h-64 overflow-y-auto text-sm">
            {(task?.activity ?? []).length === 0 ? (
              <p className="text-muted-foreground">История изменений появится после правок.</p>
            ) : (
              [...(task?.activity ?? [])]
                .slice()
                .reverse()
                .map((a) => (
                  <div key={a.id} className="rounded-md border border-border/60 p-2">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.at), 'dd.MM.yyyy HH:mm', { locale: ru })} ·{' '}
                      {assigneePickerUsers.find((u) => u.id === a.userId)?.name ?? a.userId}
                    </div>
                    <p className="mt-1">{a.summary}</p>
                  </div>
                ))
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <div className="flex flex-wrap gap-2 order-2 sm:order-1">
            {isExistingTask && onSaveAsTemplate ? (
              <Button type="button" variant="secondary" onClick={onSaveAsTemplate}>
                Сохранить как шаблон
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              {isExistingTask ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}