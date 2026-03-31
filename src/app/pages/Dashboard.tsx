import { useMemo } from 'react';
import { useStore } from '../store';
import { withoutGhostServiceUser } from '../constants/serviceAccount';
import { TeamStats } from '../components/TeamStats';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { BarChart3, Calendar, CalendarClock, Users, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { addDays, format, isBefore, isSameDay, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  filterUsersByPermissions,
  filterTasksByPermissions,
  hasBroadAccess,
  canAccessMediaWorkloadNav,
} from '../utils/permissions';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
  const { users, tasks, completedTasksLifetimeTotal, channels, currentUser, staffBlocks, jobPositions } =
    useStore();

  // Фильтруем пользователей и задачи по правам доступа
  const visibleUsers = filterUsersByPermissions(users, currentUser, staffBlocks);
  const visibleTasks = filterTasksByPermissions(tasks, currentUser, users, staffBlocks);
  const displayUsers = useMemo(() => withoutGhostServiceUser(visibleUsers), [visibleUsers]);
  const seesAll = hasBroadAccess(currentUser);
  const blockName = currentUser ? staffBlocks.find((b) => b.id === currentUser.blockId)?.name : null;
  const canOpenArchive =
    currentUser && canAccessMediaWorkloadNav(currentUser, staffBlocks);

  const activeTasks = visibleTasks.filter(t => !t.completed);
  const completedTasks = visibleTasks.filter(t => t.completed);
  const overdueTasks = activeTasks.filter(t => t.deadline && isBefore(new Date(t.deadline), new Date()));
  const tasksWithKPI = visibleTasks.filter(t => t.kpiType !== 'none');

  const publics = useMemo(() => {
    if (!currentUser) return [];
    return channels.filter((c) => c.kind === 'public' && c.ownerUserId === currentUser.id);
  }, [channels, currentUser]);

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-600 mt-2">Обзор медиапланирования и загруженности команды</p>
      </div>

      {/* Информация о правах доступа */}
      {!seesAll && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Вы видите только свои задачи и сотрудников своего блока
                  {blockName ? ` («${blockName}»).` : '.'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Средние и полные права открывают все задачи и всех сотрудников; полные дополнительно управляют блоками и должностями.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Активные задачи</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">В работе</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Завершено</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasksLifetimeTotal}</div>
            <p className="text-xs text-gray-500 mt-1">Выполнено задач (всего, с учётом удалённых из архива)</p>
            {canOpenArchive && (completedTasks.length > 0 || completedTasksLifetimeTotal > 0) && (
              <Link to="/archive" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                Открыть архив
                {completedTasks.length > 0 && (
                  <span className="text-gray-500"> ({completedTasks.length} в архиве)</span>
                )}
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Просрочено</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <p className="text-xs text-gray-500 mt-1">Требуют внимания</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">С KPI</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{tasksWithKPI.length}</div>
            <p className="text-xs text-gray-500 mt-1">Задачи с целями</p>
          </CardContent>
        </Card>
      </div>

      {/* Команда */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Загруженность команды</h2>
            <Link to="/team">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Управление командой
              </Button>
            </Link>
          </div>
          <TeamStats
            users={displayUsers}
            tasks={visibleTasks}
            jobPositions={jobPositions}
            staffBlocks={staffBlocks}
            workloadScope="media"
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <Link to="/mediaplan" className="block">
              <Button className="w-full" size="lg">
                <Calendar className="h-5 w-5 mr-2" />
                Открыть медиаплан
              </Button>
            </Link>
            <Link to="/meetings" className="block">
              <Button variant="outline" className="w-full" size="lg">
                <CalendarClock className="h-5 w-5 mr-2" />
                Планер встреч
              </Button>
            </Link>
            <Link to="/team" className="block">
              <Button variant="outline" className="w-full" size="lg">
                <Users className="h-5 w-5 mr-2" />
                Управление командой
              </Button>
            </Link>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Команда</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{displayUsers.length}</div>
              <p className="text-sm text-gray-500 mt-1">Всего сотрудников</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Заполняемость пабликов */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Заполняемость пабликов</h2>
        {publics.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-gray-600">
              Создайте паблик в разделе{' '}
              <Link to="/contentplan" className="text-blue-600 hover:underline">
                контент план
              </Link>
              , чтобы он появился здесь.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publics.map((pub) => {
              const totalWeek = weekDays.reduce((acc, day) => {
                const cnt = visibleTasks.filter(
                  (t) =>
                    !t.completed &&
                    Boolean(t.deadline) &&
                    isSameDay(new Date(t.deadline as string), day) &&
                    t.channels.includes(pub.id),
                ).length;
                return acc + cnt;
              }, 0);

              return (
                <Card key={pub.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{pub.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">Постов за неделю: {totalWeek}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {weekDays.map((day) => {
                        const cnt = visibleTasks.filter(
                          (t) =>
                            !t.completed &&
                            Boolean(t.deadline) &&
                            isSameDay(new Date(t.deadline as string), day) &&
                            t.channels.includes(pub.id),
                        ).length;
                        return (
                          <div
                            key={day.toISOString()}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-gray-600">
                              {format(day, 'EEE dd.MM', { locale: ru })}
                            </span>
                            <Badge variant={cnt > 3 ? 'destructive' : 'outline'}>
                              {cnt}/3
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

Dashboard.displayName = 'Dashboard';