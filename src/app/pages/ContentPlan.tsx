import { useMemo, useState } from 'react';
import { format, isSameDay, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStore } from '../store';
import { filterTasksByPermissions } from '../utils/permissions';
import type { Task, TaskCategory, KPIType, RecurrenceType, ContentSocialPlatform } from '../types';
import { contentSocialPlatformLabels } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Card, CardContent, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { isServiceAccount } from '../constants/serviceAccount';
import { cn } from '../components/ui/utils';

type Slot = { index: number; time: string; label: string };

const CONTENT_PLATFORMS: ContentSocialPlatform[] = ['vk', 'max', 'telegram', 'ok'];
const DEFAULT_CONTENT_PLATFORM: ContentSocialPlatform = 'vk';

const SLOT_TIMES: Slot[] = [
  { index: 0, time: '10:00', label: 'Утро' },
  { index: 1, time: '14:00', label: 'День' },
  { index: 2, time: '18:00', label: 'Вечер' },
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
  const [editingDay, setEditingDay] = useState<Date | null>(null);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number>(0);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postPlatform, setPostPlatform] = useState<ContentSocialPlatform>(DEFAULT_CONTENT_PLATFORM);

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const visibleTasks = useMemo(
    () => filterTasksByPermissions(tasks, currentUser, users, staffBlocks),
    [tasks, currentUser, users, staffBlocks],
  );

  const publics = useMemo(() => {
    if (!currentUser || isServiceAccount(currentUser)) return [];
    return channels.filter((c) => c.kind === 'public' && c.ownerUserId === currentUser.id);
  }, [channels, currentUser]);

  const gridTemplate = useMemo(() => {
    const n = Math.max(publics.length, 1);
    return { gridTemplateColumns: `minmax(11rem,13rem) repeat(${n}, minmax(10.5rem, 1fr))` } as const;
  }, [publics.length]);

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
    setPostPlatform(DEFAULT_CONTENT_PLATFORM);
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
      setPostPlatform(existing.socialPlatform ?? DEFAULT_CONTENT_PLATFORM);
    } else {
      setEditingTaskId(null);
      setPostTitle('');
      setPostDescription('');
      setPostPlatform(DEFAULT_CONTENT_PLATFORM);
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
      socialPlatform: postPlatform,
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

    const postsToDelete = tasks.filter((t) => t.category === 'bloggers' && t.channels.includes(publicId));
    postsToDelete.forEach((t) => deleteTask(t.id));
    deleteChannel(publicId);

    if (editingPublicId === publicId) {
      setDialogOpen(false);
      resetDialog();
    }

    toast.success('Паблик удалён');
  };

  const goThisWeek = () => setWeekAnchor(new Date());

  if (!currentUser) return null;
  if (isServiceAccount(currentUser)) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-8 text-sm text-gray-600">
            <CardTitle className="mb-2">Контент план</CardTitle>
            Раздел предназначен для сотрудников. Сервисный аккаунт — техничен.
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Контент план</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Сетка по дням: в каждой строке — один день, в столбцах — ваши паблики. Удобно видеть, что выходит во всех
            каналах в выбранный день. До 3 постов на паблик в сутки.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="secondary" onClick={goThisWeek} className="w-full sm:w-auto">
            <CalendarDays className="h-4 w-4 mr-2" />
            Текущая неделя
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWeekAnchor((d) => addDays(d, -7))}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWeekAnchor((d) => addDays(d, 7))}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Вперёд</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-700 mb-4">
        {format(weekStart, 'd MMMM', { locale: ru })} — {format(weekEnd, 'd MMMM yyyy', { locale: ru })}
      </p>

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <Label htmlFor="public-name">Новый паблик</Label>
            <Input
              id="public-name"
              value={publicName}
              onChange={(e) => setPublicName(e.target.value)}
              placeholder="Название — попадёт в каналы коммуникаций"
              className="mt-1"
            />
          </div>
          <Button onClick={handleCreatePublic} className="sm:h-10 w-full sm:w-auto shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Добавить паблик
          </Button>
        </div>
      </div>

      {publics.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-600">
            Пока нет ваших пабликов. Создайте хотя бы один — появится таблица по дням.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[720px] p-2">
            {/* Шапка: паблики */}
            <div className="grid gap-2 mb-2" style={gridTemplate}>
              <div className="sticky left-0 z-20 bg-white rounded-lg border border-transparent p-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                День
              </div>
              {publics.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-2 py-2 flex items-center justify-between gap-2 min-h-[3rem]"
                >
                  <span className="text-sm font-semibold text-slate-800 truncate" title={p.name}>
                    {p.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeletePublic(p.id)}
                    aria-label={`Удалить паблик ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Строки: дни */}
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className="grid gap-2 mb-2 last:mb-0" style={gridTemplate}>
                  <div
                    className={cn(
                      'sticky left-0 z-20 rounded-lg border p-2 flex flex-col justify-center min-h-[7.5rem] bg-white',
                      isToday ? 'border-blue-400 bg-blue-50/80 ring-1 ring-blue-200' : 'border-slate-200',
                    )}
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      {format(day, 'EEE', { locale: ru })}
                    </span>
                    <span className="text-lg font-bold text-slate-900">{format(day, 'd.MM')}</span>
                    {isToday && <span className="text-[10px] font-medium text-blue-700 mt-0.5">сегодня</span>}
                  </div>

                  {publics.map((p) => (
                    <div
                      key={`${day.toISOString()}-${p.id}`}
                      className={cn(
                        'rounded-lg border p-2 flex flex-col gap-1.5 min-h-[7.5rem]',
                        isToday ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50/40',
                      )}
                    >
                      {SLOT_TIMES.map((slot) => {
                        const existing = findPostInSlot(p.id, day, slot);
                        return (
                          <div key={slot.index} className="relative group/slot">
                            <button
                              type="button"
                              onClick={() => openCreate(p.id, day, slot.index)}
                              className={cn(
                                'w-full text-left rounded-md border px-2 py-1.5 transition-colors text-xs',
                                existing
                                  ? 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                                  : 'border-dashed border-slate-300 bg-white/60 hover:border-slate-400 hover:bg-white',
                              )}
                            >
                              <span className="text-[10px] text-slate-500 font-medium">{slot.label} · {slot.time}</span>
                              {existing?.socialPlatform && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-sky-700">
                                  {contentSocialPlatformLabels[existing.socialPlatform]}
                                </span>
                              )}
                              <span className="block font-medium text-slate-900 line-clamp-2 mt-0.5">
                                {existing ? existing.title : 'Новый пост'}
                              </span>
                            </button>
                            {existing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover/slot:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePost(p.id, day, slot.index);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => setDialogOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? 'Редактировать пост' : 'Новый пост'}</DialogTitle>
            <DialogDescription>
              Слот {SLOT_TIMES[editingSlotIndex]?.label ?? ''} ({SLOT_TIMES[editingSlotIndex]?.time ?? ''}). Не более 3
              постов в день на паблик.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post-platform">Площадка</Label>
              <Select
                value={postPlatform}
                onValueChange={(v) => setPostPlatform(v as ContentSocialPlatform)}
              >
                <SelectTrigger id="post-platform" className="w-full">
                  <SelectValue placeholder="Выберите платформу" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {contentSocialPlatformLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
