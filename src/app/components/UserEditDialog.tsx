import { useState, useEffect } from 'react';
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
import { User, UserRole, roleLabels } from '../types';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, updates: Partial<User>) => void;
  user?: User;
}

export function UserEditDialog({ open, onOpenChange, onSave, user }: UserEditDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('smm-specialist');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setPassword(user.password);
    }
  }, [user]);

  const handleSave = () => {
    if (!name || !user) {
      alert('Введите имя пользователя');
      return;
    }

    if (!password) {
      alert('Введите пароль');
      return;
    }

    onSave(user.id, { name, role, password });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать сотрудника</DialogTitle>
          <DialogDescription>
            Измените информацию о сотруднике
          </DialogDescription>
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
            <Label htmlFor="edit-role">Должность *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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