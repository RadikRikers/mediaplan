import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { UserDialog } from '../components/UserDialog';
import { UserEditDialog } from '../components/UserEditDialog';
import { TeamStats } from '../components/TeamStats';
import { ChannelsManagement } from '../components/ChannelsManagement';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import {
  User,
  UserRole,
  roleLabels,
  permissionLabels,
  blockTaskVisibilityLabels,
  displayTaskTypeLabel,
  type BlockTaskVisibility,
} from '../types';
import { SERVICE_USER_ID } from '../constants/serviceAccount';
import {
  filterUsersByPermissions,
  filterTasksByPermissions,
  hasBroadAccess,
  hasOrgFullAccess,
  hasLeadershipScope,
  canEditServiceUser,
} from '../utils/permissions';
import { toast } from 'sonner';

export default function Team() {
  const {
    users,
    tasks,
    channels,
    currentUser,
    staffBlocks,
    jobPositions,
    addUser,
    updateUser,
    deleteUser,
    addChannel,
    updateChannel,
    deleteChannel,
    addStaffBlock,
    updateStaffBlock,
    deleteStaffBlock,
    addJobPosition,
    updateJobPosition,
    deleteJobPosition,
  } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockParentId, setNewBlockParentId] = useState<string>('__root__');
  const [newPosBlockId, setNewPosBlockId] = useState('');
  const [newPosName, setNewPosName] = useState('');
  const [newPosRole, setNewPosRole] = useState<UserRole>('smm-specialist');
  const [newPosTaskTypeLabel, setNewPosTaskTypeLabel] = useState('');

  useEffect(() => {
    const blockWithPositions = staffBlocks.find((b) => jobPositions.some((p) => p.blockId === b.id));
    if (newPosBlockId === '' && blockWithPositions) {
      setNewPosBlockId(blockWithPositions.id);
    }
  }, [staffBlocks, jobPositions, newPosBlockId]);

  const visibleUsers = filterUsersByPermissions(users, currentUser, staffBlocks);
  const visibleTasks = filterTasksByPermissions(tasks, currentUser, users, staffBlocks);

  const rootBlocks = [...staffBlocks]
    .filter((b) => !b.parentBlockId)
    .sort((a, b) => {
      const la = a.leadershipScope ? 0 : 1;
      const lb = b.leadershipScope ? 0 : 1;
      if (la !== lb) return la - lb;
      return a.name.localeCompare(b.name, 'ru');
    });
  const childBlocksOf = (parentId: string) =>
    staffBlocks
      .filter((b) => b.parentBlockId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const pickableUsersForVisibility = users.filter((u) => u.id !== SERVICE_USER_ID);

  const toggleBlockExtraUser = (blockId: string, userId: string, checked: boolean) => {
    const b = staffBlocks.find((x) => x.id === blockId);
    if (!b) return;
    const set = new Set(b.taskVisibilityExtraUserIds ?? []);
    if (checked) set.add(userId);
    else set.delete(userId);
    updateStaffBlock(blockId, { taskVisibilityExtraUserIds: [...set] });
  };
  const canManageTeam = hasBroadAccess(currentUser) || hasLeadershipScope(currentUser, staffBlocks);
  const canManageOrg = hasOrgFullAccess(currentUser);

  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target && !canEditServiceUser(currentUser, target, staffBlocks)) {
      toast.error('Нельзя удалить этого пользователя');
      return;
    }
    const userTasks = visibleTasks.filter((t) => t.assignees.includes(userId) && !t.completed);
    if (userTasks.length > 0) {
      if (
        !confirm(`У этого сотрудника есть ${userTasks.length} активных задач. Вы уверены, что хотите удалить?`)
      ) {
        return;
      }
    }
    deleteUser(userId);
  };

  const handleEditUser = (user: User) => {
    if (!canEditServiceUser(currentUser, user, staffBlocks)) {
      toast.error('Сервисный аккаунт может менять только учётка с полными правами');
      return;
    }
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const positionLabel = (u: User) =>
    jobPositions.find((p) => p.id === u.positionId)?.name ?? roleLabels[u.role];

  const renderBlock = (blockId: string, blockTitle: string) => {
    const blockUsers = visibleUsers.filter((us) => us.blockId === blockId);
    return (
      <Card key={blockId}>
        <CardHeader>
          <CardTitle>{blockTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {blockUsers.map((user) => {
              const userTasks = visibleTasks.filter((t) => t.assignees.includes(user.id) && !t.completed);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {positionLabel(user)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {displayTaskTypeLabel(user, jobPositions)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {permissionLabels[user.permissionLevel]}
                      </Badge>
                      <span className="text-sm text-gray-500">{userTasks.length} задач</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canManageTeam && canEditServiceUser(currentUser, user, staffBlocks) && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
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
              <p className="text-sm text-gray-500 text-center py-4">Нет сотрудников в этом блоке</p>
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
          <p className="text-gray-600 mt-2">Управление сотрудниками, структурой и каналами</p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
        )}
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="team">Сотрудники</TabsTrigger>
          {canManageOrg && <TabsTrigger value="org">Блоки и должности</TabsTrigger>}
          <TabsTrigger value="channels">Каналы коммуникации</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Структура команды</h2>
              <p className="text-sm text-gray-600">
                Блок «Общее руководство» в корне — сотрудники с этой привязкой видят и могут вести все задачи
                всех блоков. Медиаблок объединяет подразделения; остальные по-прежнему привязаны к подблокам
                (SMM, копирайтинг, контент).
              </p>
              {rootBlocks.map((root) => (
                <div key={root.id} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">{root.name}</h3>
                  {childBlocksOf(root.id).length > 0 ? (
                    <div className="space-y-4 pl-0 sm:pl-3 border-l-2 border-gray-100">
                      {childBlocksOf(root.id).map((ch) => renderBlock(ch.id, ch.name))}
                    </div>
                  ) : (
                    renderBlock(root.id, root.name)
                  )}
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Загруженность</h2>
              <TeamStats users={visibleUsers} tasks={visibleTasks} jobPositions={jobPositions} />
            </div>
          </div>
        </TabsContent>

        {canManageOrg && (
          <TabsContent value="org">
            <div className="grid gap-8 max-w-3xl">
              <Card>
                <CardHeader>
                  <CardTitle>Блоки сотрудников</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Видимость задач: для задач с исполнителями из подблока кто видит их в списках (кроме своих
                    назначенных и средних/полных прав). Сервисный аккаунт видит все задачи без ограничений.
                  </p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <div className="flex-1 min-w-[160px] space-y-2">
                      <Label>Новый блок / подблок</Label>
                      <Input
                        value={newBlockName}
                        onChange={(e) => setNewBlockName(e.target.value)}
                        placeholder="Название"
                      />
                    </div>
                    <div className="w-full sm:w-56 space-y-2">
                      <Label>Внутри блока</Label>
                      <Select value={newBlockParentId} onValueChange={setNewBlockParentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Родитель" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__root__">Корень (общий блок)</SelectItem>
                          {staffBlocks.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              Подблок: {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const n = newBlockName.trim();
                        if (!n) {
                          toast.error('Введите название');
                          return;
                        }
                        addStaffBlock(n, newBlockParentId === '__root__' ? null : newBlockParentId);
                        setNewBlockName('');
                        toast.success('Блок добавлен');
                      }}
                    >
                      Добавить блок
                    </Button>
                  </div>
                  <ul className="divide-y rounded-md border">
                    {staffBlocks.map((b) => {
                      const parent = b.parentBlockId ? staffBlocks.find((p) => p.id === b.parentBlockId) : null;
                      return (
                        <li key={b.id} className="p-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500 shrink-0 w-24">
                              {parent ? `← ${parent.name}` : 'корень'}
                            </span>
                            <Input
                              className="flex-1 min-w-[140px]"
                              value={b.name}
                              onChange={(e) => updateStaffBlock(b.id, { name: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => deleteStaffBlock(b.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 pl-0 sm:pl-28">
                            <Label className="text-xs">Видимость задач этого блока</Label>
                            <Select
                              value={b.taskVisibility}
                              onValueChange={(v) => {
                                const vis = v as BlockTaskVisibility;
                                updateStaffBlock(b.id, {
                                  taskVisibility: vis,
                                  taskVisibilityExtraUserIds:
                                    vis === 'block_and_extra' ? (b.taskVisibilityExtraUserIds ?? []) : [],
                                });
                              }}
                            >
                              <SelectTrigger className="max-w-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(blockTaskVisibilityLabels) as BlockTaskVisibility[]).map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {blockTaskVisibilityLabels[key]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {b.taskVisibility === 'block_and_extra' && (
                              <div className="rounded-md border bg-gray-50/80 p-2 max-h-40 overflow-y-auto space-y-2">
                                <p className="text-xs text-gray-600">Дополнительно видят задачи блока:</p>
                                {pickableUsersForVisibility.map((u) => (
                                  <label key={u.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={(b.taskVisibilityExtraUserIds ?? []).includes(u.id)}
                                      onCheckedChange={(c) => toggleBlockExtraUser(b.id, u.id, c === true)}
                                    />
                                    {u.name}
                                  </label>
                                ))}
                              </div>
                            )}
                            <label className="flex items-center gap-2 text-sm pt-1">
                              <Checkbox
                                checked={Boolean(b.leadershipScope)}
                                onCheckedChange={(c) =>
                                  updateStaffBlock(b.id, { leadershipScope: c === true })
                                }
                              />
                              <span>Блок общего руководства (все задачи и команда)</span>
                            </label>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Должности</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Блок</Label>
                      <Select value={newPosBlockId} onValueChange={setNewPosBlockId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите блок" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffBlocks.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Базовый тип (роль в системе)</Label>
                      <Select value={newPosRole} onValueChange={(v) => setNewPosRole(v as UserRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Подпись в задачах (свой текст, необязательно)</Label>
                      <Input
                        value={newPosTaskTypeLabel}
                        onChange={(e) => setNewPosTaskTypeLabel(e.target.value)}
                        placeholder={
                          newPosTaskTypeLabel.trim()
                            ? undefined
                            : `По умолчанию: ${roleLabels[newPosRole]}`
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Если нужной роли в списке нет — укажите произвольную подпись для отчётов и задач.
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Название должности</Label>
                      <Input
                        value={newPosName}
                        onChange={(e) => setNewPosName(e.target.value)}
                        placeholder="Например, Ведущий редактор"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        onClick={() => {
                          const n = newPosName.trim();
                          const blockId = newPosBlockId || staffBlocks[0]?.id;
                          if (!blockId || !n) {
                            toast.error('Укажите блок и название');
                            return;
                          }
                          addJobPosition({
                            name: n,
                            blockId,
                            defaultRole: newPosRole,
                            taskTypeLabel: newPosTaskTypeLabel.trim() || undefined,
                          });
                          setNewPosName('');
                          setNewPosTaskTypeLabel('');
                          toast.success('Должность добавлена');
                        }}
                      >
                        Добавить должность
                      </Button>
                    </div>
                  </div>
                  <ul className="divide-y rounded-md border">
                    {jobPositions.map((p) => {
                      const b = staffBlocks.find((x) => x.id === p.blockId);
                      return (
                        <li key={p.id} className="p-3 space-y-2">
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-sm text-gray-500 w-24 shrink-0">{b?.name ?? '—'}</span>
                            <Input
                              className="flex-1 min-w-[140px]"
                              value={p.name}
                              onChange={(e) => updateJobPosition(p.id, { name: e.target.value })}
                            />
                            <Input
                              className="w-[min(100%,220px)] min-w-[140px]"
                              placeholder={`Тип в задачах (по умолч.: ${roleLabels[p.defaultRole]})`}
                              value={p.taskTypeLabel ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateJobPosition(p.id, {
                                  taskTypeLabel: v.trim() === '' ? undefined : v,
                                });
                              }}
                            />
                            <Select
                              value={p.defaultRole}
                              onValueChange={(v) => updateJobPosition(p.id, { defaultRole: v as UserRole })}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(roleLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => deleteJobPosition(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

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
        staffBlocks={staffBlocks}
        jobPositions={jobPositions}
        actor={currentUser}
      />

      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={updateUser}
        user={editingUser}
        staffBlocks={staffBlocks}
        jobPositions={jobPositions}
        actor={currentUser}
      />
    </div>
  );
}
