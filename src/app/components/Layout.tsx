import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useStore } from '../store';
import { Button } from './ui/button';
import { LayoutDashboard, Calendar, Users, ClipboardList, LogOut, KeyRound, Archive } from 'lucide-react';
import { roleLabels } from '../types';
import { toast } from 'sonner';

export default function Layout() {
  const { currentUser, setCurrentUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const navigation = [
    { name: 'Дашборд', href: '/', icon: LayoutDashboard },
    { name: 'Медиаплан', href: '/mediaplan', icon: ClipboardList },
    { name: 'Календарь', href: '/calendar', icon: Calendar },
    { name: 'Команда', href: '/team', icon: Users },
    { name: 'Архив', href: '/archive', icon: Archive },
    { name: 'Аккаунт', href: '/account', icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Медиапланирование</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <>
                  <div className="text-sm text-right">
                    <div className="font-medium text-gray-900">{currentUser.name}</div>
                    <div className="text-gray-500">{roleLabels[currentUser.role]}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Выход
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Мобильная навигация */}
        <div className="sm:hidden border-t">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
