import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentUser, requestPushNotificationsPermission, attemptLogin } = useStore();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Вход · Медиапланирование';
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await attemptLogin(name, password);

      if (user) {
        setCurrentUser(user);
        toast.success(`Добро пожаловать, ${user.name}!`);
        void requestPushNotificationsPermission();
        navigate('/');
      } else {
        toast.error('Неверное имя пользователя или пароль');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-12">
      <Card className="w-full max-w-md border-slate-200/80 shadow-lg shadow-slate-200/40">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
              <LogIn className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center tracking-tight">Медиапланирование</CardTitle>
          <CardDescription className="text-center text-slate-600">
            Рабочий вход: задачи, медиаплан, встречи и команда
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя пользователя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Введите ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              <LogIn className="h-4 w-4 mr-2" />
              {busy ? 'Проверка…' : 'Войти'}
            </Button>
          </form>
          <p className="text-xs text-center text-slate-500 mt-4 px-1 leading-relaxed">
            При настроенном Supabase данные подтягиваются с сервера при входе. Имя можно вводить без учёта
            регистра.
          </p>
        </CardContent>
      </Card>
      <p className="mt-8 text-xs text-slate-400">Медиапланирование · внутренний инструмент</p>
    </div>
  );
}
