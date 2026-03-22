import { useState } from 'react';
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
  const { users, setCurrentUser, requestPushNotificationsPermission } = useStore();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const user = users.find(u => u.name === name && u.password === password);

    if (user) {
      setCurrentUser(user);
      toast.success(`Добро пожаловать, ${user.name}!`);
      // Запрашиваем разрешение на уведомления после действий пользователя.
      // Если пользователь отказал — просто продолжим работу с toast-напоминаниями.
      void requestPushNotificationsPermission();
      navigate('/');
    } else {
      toast.error('Неверное имя пользователя или пароль');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Система медиапланирования</CardTitle>
          <CardDescription className="text-center">
            Введите ваши учетные данные для входа
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
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Войти
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Демо-аккаунты:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong>Анна Иванова</strong> / smm123 (Старший SMM - полный доступ)</p>
              <p><strong>Петр Смирнов</strong> / smm456 (SMM - только блок SMM)</p>
              <p><strong>Мария Петрова</strong> / editor123 (Редактор - полный доступ)</p>
              <p><strong>Иван Сидоров</strong> / copy123 (Копирайтер)</p>
              <p><strong>Ольга Козлова</strong> / design123 (Дизайнер)</p>
              <p><strong>Дмитрий Морозов</strong> / video123 (Видеограф)</p>
              <p className="pt-2 border-t border-gray-200 mt-2">
                <strong>Сервисный аккаунт</strong> / service2024 (полный доступ,{' '}
                <span className="text-blue-700">сохранение данных в браузере</span>)
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                <strong>Права доступа:</strong> Редактор и Старший SMM видят всё. Остальные - только свои задачи и свой блок.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}