import { useMemo, useState, useCallback } from 'react';
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStore } from '../store';
import { canManageMeeting } from '../utils/permissions';
import { SERVICE_USER_ID } from '../constants/serviceAccount';
import type { Meeting } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  ClipboardList,
} from 'lucide-react';
import { cn } from '../components/ui/utils';

const HOUR_START = 8;
const HOUR_END = 20;
const SLOT_MINUTES = 30;
const MS_PER_SLOT = SLOT_MINUTES * 60 * 1000;
const SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES;

function dayGridStart(day: Date): Date {
  const d = startOfDay(day);
  d.setHours(HOUR_START, 0, 0, 0);
  return d;
}

function dayGridEnd(day: Date): Date {
  const d = startOfDay(day);
  d.setHours(HOUR_END, 0, 0, 0);
  return d;
}

function meetingSlotLayout(
  m: Meeting,
  columnDay: Date,
): { slotStart: number; slotSpan: number } | null {
  const start = new Date(m.startsAt);
  const end = new Date(m.endsAt);
  if (!isSameDay(start, columnDay)) return null;
  const gridA = dayGridStart(columnDay);
  const gridB = dayGridEnd(columnDay);
  const visStart = start > gridA ? start : gridA;
  const visEnd = end < gridB ? end : gridB;
  if (visEnd <= visStart) return null;
  const slotStart = Math.floor((visStart.getTime() - gridA.getTime()) / MS_PER_SLOT);
  const slotSpan = Math.max(1, Math.ceil((visEnd.getTime() - visStart.getTime()) / MS_PER_SLOT));
  const clampedStart = Math.min(Math.max(0, slotStart), SLOTS - 1);
  const clampedSpan = Math.min(slotSpan, SLOTS - clampedStart);
  return { slotStart: clampedStart, slotSpan: clampedSpan };
}

function slotTimeLabel(slotIndex: number): string {
  const totalMin = HOUR_START * 60 + slotIndex * SLOT_MINUTES;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function toTimeInput(d: Date): string {
  return format(d, 'HH:mm');
}

function combineLocalDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export default function Meetings() {
  const { users, meetings, currentUser, addMeeting, updateMeeting, deleteMeeting } = useStore();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(toDateInput(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('');
  const [preparation, setPreparation] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const teamUsers = useMemo(
    () => users.filter((u) => u.id !== SERVICE_USER_ID),
    [users],
  );

  const weekStart = useMemo(
    () => startOfWeek(weekAnchor, { weekStartsOn: 1 }),
    [weekAnchor],
  );

  const weekEndEx = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const a = new Date(m.startsAt);
      const b = new Date(m.endsAt);
      return a < weekEndEx && b > weekStart;
    });
  }, [meetings, weekStart, weekEndEx]);

  const weekRangeLabel = useMemo(
    () =>
      format(weekStart, 'd MMM', { locale: ru }) +
      ' — ' +
      format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru }),
    [weekStart],
  );

  const meetingsLaidOutByDay = useMemo(() => {
    return weekDays.map((d) =>
      weekMeetings
        .map((m) => ({ m, layout: meetingSlotLayout(m, d) }))
        .filter(
          (x): x is { m: Meeting; layout: { slotStart: number; slotSpan: number } } =>
            x.layout !== null,
        )
        .sort((a, b) => new Date(a.m.startsAt).getTime() - new Date(b.m.startsAt).getTime()),
    );
  }, [weekDays, weekMeetings]);

  const openCreateDefaults = useCallback((day: Date, slotIndex?: number) => {
    setEditingId(null);
    setDateStr(toDateInput(day));
    if (slotIndex !== undefined) {
      const grid = dayGridStart(day);
      const start = new Date(grid.getTime() + slotIndex * MS_PER_SLOT);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setStartTime(toTimeInput(start));
      setEndTime(toTimeInput(end));
    } else {
      setStartTime('10:00');
      setEndTime('11:00');
    }
    setTitle('');
    setLocation('');
    setPreparation('');
    setParticipantIds(currentUser ? [currentUser.id] : []);
    setFormOpen(true);
  }, [currentUser]);

  const openEdit = (m: Meeting) => {
    setEditingId(m.id);
    setTitle(m.title);
    const s = new Date(m.startsAt);
    setDateStr(toDateInput(s));
    setStartTime(toTimeInput(s));
    setEndTime(toTimeInput(new Date(m.endsAt)));
    setLocation(m.location);
    setPreparation(m.preparation ?? '');
    setParticipantIds([...m.participantIds]);
    setFormOpen(true);
    setDetailMeeting(null);
  };

  const submitForm = () => {
    const t = title.trim();
    if (!t) {
      toast.error('Укажите название встречи');
      return;
    }
    if (editingId) {
      const existing = meetings.find((x) => x.id === editingId);
      if (!existing || !canManageMeeting(existing, currentUser)) {
        toast.error('Нет прав на изменение этой встречи');
        return;
      }
    }
    const startsAt = combineLocalDateTime(dateStr, startTime);
    const endsAt = combineLocalDateTime(dateStr, endTime);
    if (endsAt <= startsAt) {
      toast.error('Время окончания должно быть позже начала');
      return;
    }
    const prep = preparation.trim();
    if (editingId) {
      updateMeeting(editingId, {
        title: t,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: location.trim(),
        preparation: prep || undefined,
        participantIds,
      });
      toast.success('Встреча обновлена');
    } else {
      addMeeting({
        title: t,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: location.trim(),
        preparation: prep || undefined,
        participantIds,
      });
      toast.success('Встреча добавлена');
    }
    setFormOpen(false);
  };

  const handleDelete = (m: Meeting) => {
    if (!currentUser) return;
    if (!canManageMeeting(m, currentUser)) {
      toast.error('Нет прав на удаление');
      return;
    }
    if (!confirm('Удалить эту встречу?')) return;
    deleteMeeting(m.id);
    setDetailMeeting(null);
    toast.success('Встреча удалена');
  };

  const toggleParticipant = (id: string, checked: boolean) => {
    setParticipantIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-8 w-8 text-blue-600" />
            Планёр встреч
          </h1>
          <p className="text-gray-600 mt-1">
            Недельная сетка: выберите слот или добавьте встречу вручную. Участники видят все планёрные встречи.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-white shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-r-none"
              onClick={() => setWeekAnchor((d) => addWeeks(d, -1))}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-none px-3 text-sm font-medium text-gray-700"
              onClick={() => setWeekAnchor(new Date())}
            >
              Сегодня
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-l-none"
              onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
              aria-label="Следующая неделя"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button type="button" onClick={() => openCreateDefaults(new Date())}>
            <Plus className="h-4 w-4 mr-2" />
            Новая встреча
          </Button>
        </div>
      </div>

      <div className="mb-3 text-center sm:text-left">
        <span className="text-lg font-semibold text-gray-800 capitalize">{weekRangeLabel}</span>
      </div>

      {weekMeetings.length === 0 ? (
        <Card className="mb-6 border-dashed border-2 border-gray-200 bg-gray-50/80">
          <CardContent className="py-10 text-center text-gray-600">
            <CalendarClock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium text-gray-800">На этой неделе встреч нет</p>
            <p className="text-sm mt-1">Создайте встречу — она появится в сетке по времени и дню.</p>
            <Button className="mt-4" variant="outline" onClick={() => openCreateDefaults(weekStart)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить на эту неделю
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          className="grid min-w-[880px]"
          style={{
            gridTemplateColumns: `3.25rem repeat(7, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${SLOTS}, minmax(2rem, auto))`,
          }}
        >
          <div className="sticky left-0 z-20 bg-white border-b border-r border-gray-100" />
          {weekDays.map((d, i) => (
            <div
              key={i}
              className="border-b border-r border-gray-100 bg-slate-50/90 px-1 py-2 text-center z-10"
            >
              <div className="text-xs font-medium text-gray-500 uppercase">
                {format(d, 'EEE', { locale: ru })}
              </div>
              <div className={cn('text-sm font-semibold', isSameDay(d, new Date()) && 'text-blue-600')}>
                {format(d, 'd MMM', { locale: ru })}
              </div>
            </div>
          ))}

          {Array.from({ length: SLOTS }, (_, slotIndex) => (
            <div key={`t-${slotIndex}`} className="contents">
              <div
                className="sticky left-0 z-10 border-r border-gray-100 bg-white px-0.5 py-0 text-[10px] text-gray-400 text-right pr-1 flex items-start justify-end pt-0.5"
                style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
              >
                {slotIndex % 2 === 0 ? slotTimeLabel(slotIndex) : ''}
              </div>
              {weekDays.map((d, di) => (
                <button
                  key={`${slotIndex}-${di}`}
                  type="button"
                  className="border-r border-b border-gray-100 hover:bg-blue-50/40 transition-colors min-h-[2rem]"
                  style={{ gridColumn: di + 2, gridRow: slotIndex + 2 }}
                  aria-label={`Слот ${slotTimeLabel(slotIndex)}, ${format(d, 'EEEE d MMMM', { locale: ru })}`}
                  onClick={() => openCreateDefaults(d, slotIndex)}
                />
              ))}
            </div>
          ))}

          {meetingsLaidOutByDay.flatMap((items, di) =>
            items.map(({ m, layout }, idx) => (
              <button
                key={`${m.id}-${di}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailMeeting(m);
                }}
                className={cn(
                  'mx-0.5 my-px rounded-md border border-blue-300/80 bg-gradient-to-br from-blue-50 to-indigo-50/90 px-1.5 py-1 text-left shadow-sm overflow-hidden z-30 hover:ring-2 hover:ring-blue-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                )}
                style={{
                  gridColumn: di + 2,
                  gridRow: `${layout.slotStart + 2} / span ${layout.slotSpan}`,
                }}
              >
                <div className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2">{m.title}</div>
                <div className="text-[10px] text-blue-800/90 mt-0.5">
                  {format(new Date(m.startsAt), 'HH:mm')} – {format(new Date(m.endsAt), 'HH:mm')}
                </div>
                {m.participantIds.length > 0 && (
                  <div className="flex items-center gap-0.5 text-[10px] text-gray-600 mt-0.5">
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.participantIds.length}</span>
                  </div>
                )}
              </button>
            )),
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Сетка с {HOUR_START}:00 до {HOUR_END}:00, шаг {SLOT_MINUTES} мин. Нажмите на пустую ячейку — откроется форма с подставленным временем.
      </p>

      <Dialog open={!!detailMeeting} onOpenChange={(o) => !o && setDetailMeeting(null)}>
        <DialogContent className="max-w-md">
          {detailMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>{detailMeeting.title}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 text-left text-gray-700 pt-2">
                    <div className="flex items-start gap-2 text-sm">
                      <CalendarClock className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                      <div>
                        <div className="font-medium capitalize">
                          {format(new Date(detailMeeting.startsAt), 'EEEE, d MMMM yyyy', { locale: ru })}
                        </div>
                        <div>
                          {format(new Date(detailMeeting.startsAt), 'HH:mm')} —{' '}
                          {format(new Date(detailMeeting.endsAt), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                      <span>{detailMeeting.location.trim() || 'Место не указано'}</span>
                    </div>
                    {detailMeeting.preparation?.trim() ? (
                      <div className="flex items-start gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                        <span className="whitespace-pre-wrap">{detailMeeting.preparation}</span>
                      </div>
                    ) : null}
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 mb-1 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Участники
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                        {detailMeeting.participantIds.length === 0 ? (
                          <li className="list-none pl-0 text-gray-500">Не выбраны</li>
                        ) : (
                          detailMeeting.participantIds.map((pid) => {
                            const u = users.find((x) => x.id === pid);
                            return <li key={pid}>{u?.name ?? `id ${pid}`}</li>;
                          })
                        )}
                      </ul>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                {canManageMeeting(detailMeeting, currentUser) ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => openEdit(detailMeeting)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(detailMeeting)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 w-full text-left">
                    Удалить и редактировать может автор встречи или сотрудник с полным доступом (редактор / старший SMM).
                  </p>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактирование встречи' : 'Новая встреча'}</DialogTitle>
            <DialogDescription>
              Укажите время, место и участников. Поле «Подготовка» необязательно.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="meet-title">Название</Label>
              <Input
                id="meet-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например, Синк по федеральному контенту"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meet-date">Дата</Label>
              <Input id="meet-date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="meet-start">Начало</Label>
                <Input
                  id="meet-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meet-end">Окончание</Label>
                <Input id="meet-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meet-loc">Место / ссылка</Label>
              <Input
                id="meet-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Переговорная 3, Zoom…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meet-prep">Что подготовить (необязательно)</Label>
              <Textarea
                id="meet-prep"
                value={preparation}
                onChange={(e) => setPreparation(e.target.value)}
                placeholder="Тезисы, материалы, вопросы к встрече"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Участники</Label>
              <div className="rounded-md border border-gray-200 max-h-48 overflow-y-auto p-2 space-y-2">
                {teamUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={participantIds.includes(u.id)}
                      onCheckedChange={(c) => toggleParticipant(u.id, c === true)}
                    />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={submitForm}>
              {editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

Meetings.displayName = 'Meetings';
