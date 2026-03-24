import { User, Task, roleLabels, roleBlocks } from '../types';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { isBefore } from 'date-fns';

interface TeamStatsProps {
  users: User[];
  tasks: Task[];
}

export function TeamStats({ users, tasks }: TeamStatsProps) {
  const MAX_TASKS_PER_USER = 30;

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assignees.includes(userId) && !t.completed);
    const overdueTasks = userTasks.filter(t => t.deadline && isBefore(new Date(t.deadline), new Date()));
    
    // 100% загруженности достигается при 30 активных задачах на человека.
    const workload = Math.min((userTasks.length / MAX_TASKS_PER_USER) * 100, 100);
    
    return {
      totalTasks: userTasks.length,
      overdueTasks: overdueTasks.length,
      workload,
    };
  };

  const renderBlockStats = (blockName: string, roles: string[]) => {
    const blockUsers = users.filter(u => roles.includes(u.role));
    
    return (
      <Card key={blockName} className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">{blockName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blockUsers.map(user => {
            const stats = getUserStats(user.id);
            return (
              <div key={user.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{roleLabels[user.role]}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{stats.totalTasks} задач</p>
                    {stats.overdueTasks > 0 && (
                      <p className="text-red-600">{stats.overdueTasks} просрочено</p>
                    )}
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
          {blockUsers.length === 0 && (
            <p className="text-sm text-gray-500">Нет сотрудников в этом блоке</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderBlockStats('Блок SMM', roleBlocks.smm)}
      {renderBlockStats('Блок копирайтинга', roleBlocks.copywriting)}
      {renderBlockStats('Блок контента', roleBlocks.content)}
    </div>
  );
}
