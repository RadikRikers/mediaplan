import { useState } from 'react';
import { useStore } from '../store';
import { UserDialog } from '../components/UserDialog';
import { UserEditDialog } from '../components/UserEditDialog';
import { TeamStats } from '../components/TeamStats';
import { ChannelsManagement } from '../components/ChannelsManagement';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { roleLabels, roleBlocks, User } from '../types';
import { filterUsersByPermissions, filterTasksByPermissions, hasFullAccess } from '../utils/permissions';

export default function Team() {
  const { users, tasks, channels, currentUser, addUser, updateUser, deleteUser, addChannel, updateChannel, deleteChannel } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  // Фильтруем пользователей и задачи по правам доступа
  const visibleUsers = filterUsersByPermissions(users, currentUser);
  const visibleTasks = filterTasksByPermissions(tasks, currentUser);
  const canManageTeam = hasFullAccess(currentUser);

  const handleDeleteUser = (userId: string) => {
    const userTasks = visibleTasks.filter(t => t.assignees.includes(userId) && !t.completed);
    if (userTasks.length > 0) {
      if (!confirm(`У этого сотрудника есть ${userTasks.length} активных задач. Вы уверены, что хотите удалить?`)) {
        return;
      }
    }
    deleteUser(userId);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const renderUsersByBlock = (blockName: string, roles: string[]) => {
    const blockUsers = visibleUsers.filter(u => roles.includes(u.role));
    
    return (
      <Card key={blockName}>
        <CardHeader>
          <CardTitle>{blockName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {blockUsers.map(user => {
              const userTasks = visibleTasks.filter(t => t.assignees.includes(user.id) && !t.completed);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[user.role]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {userTasks.length} задач
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canManageTeam && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {blockUsers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Нет сотрудников в этом блоке
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Команда</h1>
          <p className="text-gray-600 mt-2">Управление сотрудниками и каналами коммуникации</p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
        )}
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="team">Сотрудники</TabsTrigger>
          <TabsTrigger value="channels">Каналы коммуникации</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Структура команды</h2>
              {renderUsersByBlock('Блок SMM', roleBlocks.smm)}
              {renderUsersByBlock('Блок копирайтинга', roleBlocks.copywriting)}
              {renderUsersByBlock('Блок контента', roleBlocks.content)}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Загруженность</h2>
              <TeamStats users={visibleUsers} tasks={visibleTasks} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="channels">
          <div className="max-w-2xl">
            <ChannelsManagement
              channels={channels}
              onAdd={addChannel}
              onUpdate={updateChannel}
              onDelete={deleteChannel}
            />
          </div>
        </TabsContent>
      </Tabs>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={addUser}
      />

      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={updateUser}
        user={editingUser}
      />
    </div>
  );
}