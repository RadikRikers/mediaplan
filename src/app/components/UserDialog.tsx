import { useState } from 'react';
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

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: Omit<User, 'id' | 'createdAt'>) => void;
}

export function UserDialog({ open, onOpenChange, onSave }: UserDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('smm-specialist');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    if (!name) {
      alert('Введите имя пользователя');
      return;
    }

    if (!password) {
      alert('Введите пароль');
      return;
    }

    onSave({ name, role, password });
    onOpenChange(false);
    setName('');
    setRole('smm-specialist');
    setPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить сотрудника</DialogTitle>
          <DialogDescription>
            Добавьте нового члена редакции
          </DialogDescription>
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
            <Label htmlFor="role">Должность *</Label>
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