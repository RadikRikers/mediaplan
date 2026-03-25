import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStore } from '../store';
import { filterTasksByPermissions } from '../utils/permissions';
import type { CommunicationChannel, Task } from '../types';
import type { TaskCategory, KPIType, RecurrenceType } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { isServiceAccount } from '../constants/serviceAccount';

type Slot = { index: number; time: string; label: string };

const SLOT_TIMES: Slot[] = [
  { index: 0, time: '10:00', label: '1' },
  { index: 1, time: '14:00', label: '2' },
  { index: 2, time: '18:00', label: '3' },
];

function combineLocalDateAndTime(day: Date, timeHHmm: string): string {
  const dateStr = format(day, 'yyyy-MM-dd');
  const dt = new Date(`${dateStr}T${timeHHmm}:00`);
  return dt.toISOString();
}

function timeHHmm(d: Date): string {
  return format(d, 'HH:mm');
}

export default function ContentPlan() {
  const {
    users,
    tasks,
    channels,
    currentUser,
    staffBlocks,
    addChannel,
    deleteChannel,
    addTask,
    updateTask,
    deleteTask,
  } = useStore();

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [publicName, setPublicName] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [activePublicId, setActivePublicId] = useState<string>('');
  const [editingDay, setEditingDay] = useState<Date | null>(null);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number>(0);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const visibleTasks = useMemo(
    () => filterTasksByPermissions(tasks, currentUser, users, staffBlocks),
    [tasks, currentUser, users, staffBlocks],
  );

  const publics = useMemo(() => {
    if (!currentUser || isServiceAccount(currentUser)) return [];
    return channels.filter((c) => c.kind === 'public' && c.ownerUserId === currentUser.id);
  }, [channels, currentUser]);

  useEffect(() => {
    if (publics.length === 0) {
      if (activePublicId) setActivePublicId('');
      return;
    }

    if (!activePublicId) {
      setActivePublicId(publics[0]?.id ?? '');
      return;
    }

    const stillExists = publics.some((p) => p.id === activePublicId);
    if (!stillExists) setActivePublicId(publics[0]?.id ?? '');
  }, [publics, activePublicId]);

  const findPostInSlot = (publicId: string, day: Date, slot: Slot): Task | null => {
    const targetTime = slot.time;
    const match = visibleTasks.find((t) => {
      if (t.completed) return false;
      if (t.category !== 'bloggers') return false;
      if (!t.channels.includes(publicId)) return false;
      if (!t.deadline) return false;
      const dt = new Date(t.deadline);
      if (!isSameDay(dt, day)) return false;
      return timeHHmm(dt) === targetTime;
    });
    return match ?? null;
  };

  const resetDialog = () => {
    setEditingTaskId(null);
    setEditingPublicId(null);
    setEditingDay(null);
    setEditingSlotIndex(0);
    setPostTitle('');
    setPostDescription('');
  };

  const openCreate = (publicId: string, day: Date, slotIndex: number) => {
    const slot = SLOT_TIMES[slotIndex];
    if (!slot) return;
    const existing = findPostInSlot(publicId, day, slot);

    setEditingPublicId(publicId);
    setEditingDay(day);
    setEditingSlotIndex(slotIndex);
    if (existing) {
      setEditingTaskId(existing.id);
      setPostTitle(existing.title ?? '');
      setPostDescription(existing.description ?? '');
    } else {
      setEditingTaskId(null);
      setPostTitle('');
      setPostDescription('');
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!currentUser || !editingPublicId || !editingDay) return;
    if (!postTitle.trim()) {
      toast.error('Укажите заголовок поста');
      return;
    }

    const slot = SLOT_TIMES[editingSlotIndex];
    if (!slot) return;

    if (!editingTaskId) {
      const dayPosts = visibleTasks.filter(
        (t) =>
          !t.completed &&
          t.category === 'bloggers' &&
          t.channels.includes(editingPublicId) &&
          Boolean(t.deadline) &&
          isSameDay(new Date(t.deadline as string), editingDay),
      );
      if (dayPosts.length >= 3) {
        toast.error('Превышен лимит: максимум 3 поста в день');
        return;
      }
    }

    const deadline = combineLocalDateAndTime(editingDay, slot.time);

    const common = {
      title: postTitle.trim(),
      description: postDescription.trim(),
      deadline,
      category: 'bloggers' as TaskCategory,
      assignees: [currentUser.id],
      recurrence: 'none' as RecurrenceType,
      completed: false,
      completedAt: undefined,
      kpiType: 'none' as KPIType,
      channels: [editingPublicId],
    };

    if (editingTaskId) {
      updateTask(editingTaskId, common);
      toast.success('Пост обновлён');
    } else {
      addTask(common);
      toast.success('Пост создан');
    }

    setDialogOpen(false);
    resetDialog();
  };

  const handleDeletePost = (publicId: string, day: Date, slotIndex: number) => {
    if (!currentUser) return;
    const slot = SLOT_TIMES[slotIndex];
    if (!slot) return;
    const existing = findPostInSlot(publicId, day, slot);
    if (!existing) return;
    if (!confirm('Удалить пост?')) return;
    deleteTask(existing.id);
    toast.success('Пост удалён');
  };

  const handleCreatePublic = () => {
    if (!currentUser || isServiceAccount(currentUser)) return;
    const n = publicName.trim();
    if (!n) {
      toast.error('Введите название паблика');
      return;
    }
    const exists = channels.some((c) => c.kind === 'public' && c.ownerUserId === currentUser.id && c.name === n);
    if (exists) {
      toast.error('Паблик с таким названием уже существует');
      return;
    }
    addChannel({ name: n, kind: 'public', ownerUserId: currentUser.id });
    setPublicName('');
    toast.success('Паблик создан');
  };

  const handleDeletePublic = (publicId: string) => {
    if (!currentUser) return;
    const pub = publics.find((p) => p.id === publicId);
    const n = pub?.name ?? 'этот паблик';

    if (!confirm(`Удалить паблик «${n}» и все связанные посты?`)) return;

    const postsToDelete = tasks.filter(
      (t) => t.category === 'bloggers' && t.channels.includes(publicId),
    );
    postsToDelete.forEach((t) => deleteTask(t.id));
    deleteChannel(publicId);

    if (editingPublicId === publicId) {
      setDialogOpen(false);
      resetDialog();
    }

    // activePublicId обновится через useEffect по publics
    toast.success('Паблик удалён');
  };

  if (!currentUser) return null;
  if (isServiceAccount(currentUser)) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Контент план</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Раздел предназначен для сотрудников. Сервисный аккаунт — техничен.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Контент план</h1>
          <p className="text-gray-600 mt-2">
            Паблики, которые вы создаёте, показываются в этой сетке. Максимум 3 поста в день.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWeekAnchor((d) => addDays(d, -7))}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Неделя
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setWeekAnchor((d) => addDays(d, 7))}
            className="w-full sm:w-auto"
          >
            Неделя
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <Label htmlFor="public-name">Добавить паблик</Label>
            <Input
              id="public-name"
              value={publicName}
              onChange={(e) => setPublicName(e.target.value)}
              placeholder="Например, Telegram паблик «Новости»"
            />
          </div>
          <Button onClick={handleCreatePublic} className="sm:h-10 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Создать паблик
          </Button>
        </div>
      </div>

      {publics.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-600">
            Пока нет ваших пабликов. Создайте хотя бы один — и вы увидите его сетку.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activePublicId} onValueChange={setActivePublicId} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {publics.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs sm:text-sm px-2 py-2">
                {p.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {publics.map((p) => (
            <TabsContent key={p.id} value={p.id} className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <CardTitle className="text-lg truncate">{p.name}</CardTitle>
                    <div className="text-sm text-gray-500 hidden sm:block">
                      {format(weekStart, 'd MMM', { locale: ru })} —{' '}
                      {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePublic(p.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить паблик
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-3">
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="border rounded-lg bg-white p-2">
                        <div className="text-xs font-semibold text-gray-900 mb-2">
                          {format(day, 'EEE dd.MM', { locale: ru })}
                        </div>

                        <div className="space-y-2">
                          {SLOT_TIMES.map((slot) => {
                            const existing = findPostInSlot(p.id, day, slot);
                            return (
                              <div key={slot.index} className="relative">
                                <Button
                                  type="button"
                                  variant={existing ? 'default' : 'outline'}
                                  className="w-full justify-start h-auto py-2 px-2"
                                  onClick={() => openCreate(p.id, day, slot.index)}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-700/80">{slot.time}</span>
                                    <span className="text-sm font-medium line-clamp-2">
                                      {existing ? existing.title : 'Добавить пост'}
                                    </span>
                                  </div>
                                </Button>

                                {existing && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-1 -right-1 h-6 w-6 bg-white/80 hover:bg-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePost(p.id, day, slot.index);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => setDialogOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? 'Редактировать пост' : 'Новый пост'}</DialogTitle>
            <DialogDescription>
              Максимум 3 поста в день. Дата и время фиксируются по выбранному слоту.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post-title">Заголовок *</Label>
              <Input id="post-title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-desc">Описание</Label>
              <Textarea
                id="post-desc"
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="Текст поста / тезисы"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetDialog();
              }}
            >
              Отмена
            </Button>
            <Button type="button" onClick={handleSave}>
              {editingTaskId ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

