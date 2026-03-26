import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { isRemoteSyncConfigured } from '../api/backend';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { isServiceAccount } from '../constants/serviceAccount';
import { RefreshCw } from 'lucide-react';

export default function Account() {
  const { currentUser, updateUser, pullFromServer, cloudSyncStatus } = useStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);

  const handlePullSync = async () => {
    if (!isRemoteSyncConfigured()) {
      toast.message('Облако не подключено', {
        description: 'Задайте переменные Supabase в .env для синхронизации.',
      });
      return;
    }
    setSyncBusy(true);
    try {
      const ok = await pullFromServer();
      if (ok) toast.success('Данные обновлены с сервера');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Сначала выполните вход');
      return;
    }

    if (currentUser.password !== oldPassword) {
      toast.error('Старый пароль неверный');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Новый пароль слишком короткий (минимум 4 символа)');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    updateUser(currentUser.id, { password: newPassword });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Пароль обновлен');
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Аккаунт</h1>
        <p className="text-gray-600 mt-2">Смена пароля для текущего пользователя</p>
        {!isServiceAccount(currentUser) && !isRemoteSyncConfigured() && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
            Постоянное сохранение в браузере (задачи, команда и т.д.) доступно только под{' '}
            <strong>учётной записью с полными правами</strong>. Для остальных ролей смена пароля может
            действовать до обновления страницы, если не включена синхронизация Supabase.
          </p>
        )}
      </div>

      {isRemoteSyncConfigured() && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Синхронизация</CardTitle>
            <CardDescription>
              Подтянуть актуальное состояние из Supabase (задачи, команду, встречи). Полезно после работы с
              другого устройства.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              disabled={syncBusy || cloudSyncStatus === 'loading' || cloudSyncStatus === 'saving'}
              onClick={() => void handlePullSync()}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncBusy || cloudSyncStatus === 'loading' || cloudSyncStatus === 'saving' ? 'animate-spin' : ''}`}
              />
              Обновить с сервера
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Сменить пароль</CardTitle>
          <CardDescription>
            При подключённом Supabase пароль сохраняется в общем состоянии и действует на всех устройствах после синхронизации.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Старый пароль</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтверждение</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Обновить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

