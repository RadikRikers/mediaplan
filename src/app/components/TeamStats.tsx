import { User, Task, JobPosition, StaffBlock, displayTaskTypeLabel } from '../types';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { isBefore } from 'date-fns';
import { LEADERSHIP_BLOCK_ID, MEDIA_SUB_BLOCK_IDS } from '../constants/staffBlockIds';

export type TeamStatsWorkloadScope = 'media' | 'organization';

interface TeamStatsProps {
  users: User[];
  tasks: Task[];
  jobPositions: JobPosition[];
  staffBlocks: StaffBlock[];
  /** media — только подблоки медиа (дашборд); organization — все блоки из списка пользователей */
  workloadScope: TeamStatsWorkloadScope;
}

export function TeamStats({ users, tasks, jobPositions, staffBlocks, workloadScope }: TeamStatsProps) {
  const MAX_TASKS_PER_USER = 30;

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter((t) => t.assignees.includes(userId) && !t.completed);
    const overdueTasks = userTasks.filter((t) => t.deadline && isBefore(new Date(t.deadline), new Date()));

    const workload = Math.min((userTasks.length / MAX_TASKS_PER_USER) * 100, 100);

    return {
      totalTasks: userTasks.length,
      overdueTasks: overdueTasks.length,
      workload,
    };
  };

  const blockTitle = (blockId: string) => staffBlocks.find((b) => b.id === blockId)?.name ?? blockId;

  const renderUsersCard = (title: string, blockUsers: User[]) => (
    <Card key={title} className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockUsers.map((user) => {
          const stats = getUserStats(user.id);
          return (
            <div key={user.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{displayTaskTypeLabel(user, jobPositions)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{stats.totalTasks} задач</p>
                  {stats.overdueTasks > 0 && <p className="text-red-600">{stats.overdueTasks} просрочено</p>}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Загруженность</span>
                  <span>{Math.round(stats.workload)}%</span>
                </div>
                <Progress value={stats.workload} className="h-2" />
              </div>
            </div>
          );
        })}
        {blockUsers.length === 0 && <p className="text-sm text-gray-500">Нет сотрудников в этом блоке</p>}
      </CardContent>
    </Card>
  );

  if (workloadScope === 'media') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Загруженность по медиаблоку (SMM, копирайтинг, контент). Блок «Общее руководство» здесь не показывается.
        </p>
        {MEDIA_SUB_BLOCK_IDS.map((blockId) =>
          renderUsersCard(
            blockTitle(blockId),
            users.filter((u) => u.blockId === blockId),
          ),
        )}
      </div>
    );
  }

  const blockIds = [...new Set(users.map((u) => u.blockId))].filter(Boolean);
  const sorted = [...blockIds].sort((a, b) => {
    if (a === LEADERSHIP_BLOCK_ID) return -1;
    if (b === LEADERSHIP_BLOCK_ID) return 1;
    const ia = MEDIA_SUB_BLOCK_IDS.indexOf(a as (typeof MEDIA_SUB_BLOCK_IDS)[number]);
    const ib = MEDIA_SUB_BLOCK_IDS.indexOf(b as (typeof MEDIA_SUB_BLOCK_IDS)[number]);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return blockTitle(a).localeCompare(blockTitle(b), 'ru');
  });

  return (
    <div className="space-y-4">
      {sorted.map((blockId) => renderUsersCard(blockTitle(blockId), users.filter((u) => u.blockId === blockId)))}
    </div>
  );
}
