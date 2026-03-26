import { useState, useEffect, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  User,
  StaffBlock,
  JobPosition,
  PermissionLevel,
  permissionLabels,
  roleLabels,
} from '../types';
import { canAssignPermissionLevel } from '../utils/permissions';
import { toast } from 'sonner';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, updates: Partial<User>) => void;
  user?: User;
  staffBlocks: StaffBlock[];
  jobPositions: JobPosition[];
  actor: User | null;
}

const levels: PermissionLevel[] = ['basic', 'medium', 'full'];

export function UserEditDialog({
  open,
  onOpenChange,
  onSave,
  user,
  staffBlocks,
  jobPositions,
  actor,
}: UserEditDialogProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [positionId, setPositionId] = useState('');
  const [taskTypeLabel, setTaskTypeLabel] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('basic');

  const allowedLevels = useMemo(
    () => levels.filter((l) => canAssignPermissionLevel(actor, l, staffBlocks)),
    [actor, staffBlocks],
  );

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPassword(user.password);
      setPositionId(user.positionId || jobPositions[0]?.id || '');
      setTaskTypeLabel(user.taskTypeLabel ?? '');
      setPermissionLevel(user.permissionLevel ?? 'basic');
    }
  }, [user, jobPositions]);

  const selectedPosition = jobPositions.find((p) => p.id === positionId);
  const inheritedTaskLabel = selectedPosition
    ? selectedPosition.taskTypeLabel?.trim() || roleLabels[selectedPosition.defaultRole]
    : '';

  const handleSave = () => {
    if (!name.trim() || !user) {
      toast.error('Введите имя пользователя');
      return;
    }
    if (!password) {
      toast.error('Введите пароль');
      return;
    }
    if (!selectedPosition) {
      toast.error('Выберите должность');
      return;
    }
    if (!canAssignPermissionLevel(actor, permissionLevel, staffBlocks)) {
      toast.error('Нельзя выдать такой уровень прав');
      return;
    }

    const ttl = taskTypeLabel.trim();
    const taskTypeLabelOut =
      ttl === '' || ttl === inheritedTaskLabel ? undefined : ttl;

    onSave(user.id, {
      name: name.trim(),
      password,
      role: selectedPosition.defaultRole,
      blockId: selectedPosition.blockId,
      positionId: selectedPosition.id,
      permissionLevel,
      taskTypeLabel: taskTypeLabelOut,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать сотрудника</DialogTitle>
          <DialogDescription>Должность определяет блок и роль в задачах</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Имя *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя Фамилия"
            />
          </div>

          <div className="space-y-2">
            <Label>Должность *</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите должность" />
              </SelectTrigger>
              <SelectContent>
                {staffBlocks.flatMap((b) =>
                  jobPositions
                    .filter((p) => p.blockId === b.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {b.name}: {p.name}
                      </SelectItem>
                    )),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-type">Подпись в задачах (свой текст)</Label>
            <Input
              id="edit-task-type"
              value={taskTypeLabel}
              onChange={(e) => setTaskTypeLabel(e.target.value)}
              placeholder={inheritedTaskLabel ? `По умолчанию: ${inheritedTaskLabel}` : 'Произвольная роль в задачах'}
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым, чтобы брать подпись из должности или базовой роли. Иначе введите любой текст.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Уровень прав</Label>
            <Select
              value={permissionLevel}
              onValueChange={(v) => setPermissionLevel(v as PermissionLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {permissionLabels[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Пароль *</Label>
            <Input
              id="edit-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
