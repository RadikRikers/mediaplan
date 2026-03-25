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

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: Omit<User, 'id' | 'createdAt'>) => void;
  staffBlocks: StaffBlock[];
  jobPositions: JobPosition[];
  actor: User | null;
}

const levels: PermissionLevel[] = ['basic', 'medium', 'full'];

export function UserDialog({
  open,
  onOpenChange,
  onSave,
  staffBlocks,
  jobPositions,
  actor,
}: UserDialogProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [positionId, setPositionId] = useState(() => jobPositions[0]?.id ?? '');
  const [taskTypeLabel, setTaskTypeLabel] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('basic');

  const allowedLevels = useMemo(
    () => levels.filter((l) => canAssignPermissionLevel(actor, l)),
    [actor],
  );

  useEffect(() => {
    if (!open || jobPositions.length === 0) return;
    setPositionId(jobPositions[0].id);
    setTaskTypeLabel('');
    if (actor && canAssignPermissionLevel(actor, 'basic')) setPermissionLevel('basic');
    else if (actor && canAssignPermissionLevel(actor, 'medium')) setPermissionLevel('medium');
    else setPermissionLevel('full');
  }, [open, actor, jobPositions]);

  const selectedPosition = jobPositions.find((p) => p.id === positionId);
  const inheritedTaskLabel = selectedPosition
    ? selectedPosition.taskTypeLabel?.trim() || roleLabels[selectedPosition.defaultRole]
    : '';

  const handleSave = () => {
    if (!name.trim()) {
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
    if (!canAssignPermissionLevel(actor, permissionLevel)) {
      toast.error('Нельзя выдать такой уровень прав');
      return;
    }

    const ttl = taskTypeLabel.trim();
    const taskTypeLabelOut =
      ttl === '' || ttl === inheritedTaskLabel ? undefined : ttl;

    onSave({
      name: name.trim(),
      password,
      role: selectedPosition.defaultRole,
      blockId: selectedPosition.blockId,
      positionId: selectedPosition.id,
      permissionLevel,
      taskTypeLabel: taskTypeLabelOut,
    });
    onOpenChange(false);
    setName('');
    setPassword('');
    setTaskTypeLabel('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить сотрудника</DialogTitle>
          <DialogDescription>Блок и тип прав задаются через должность и уровень доступа</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
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
            <Label htmlFor="add-task-type">Подпись в задачах (свой текст)</Label>
            <Input
              id="add-task-type"
              value={taskTypeLabel}
              onChange={(e) => setTaskTypeLabel(e.target.value)}
              placeholder={inheritedTaskLabel ? `По умолчанию: ${inheritedTaskLabel}` : 'Произвольная роль в задачах'}
            />
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
            <p className="text-xs text-muted-foreground">
              Полные — управление структурой и все данные; средние — все задачи и сотрудники; начальные — свой блок.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль *</Label>
            <Input
              id="password"
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
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
