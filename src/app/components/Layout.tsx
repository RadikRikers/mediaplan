import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useStore } from '../store';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  LogOut,
  KeyRound,
  Archive,
  CalendarClock,
  Menu,
} from 'lucide-react';
import { roleLabels } from '../types';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

export default function Layout() {
  const { currentUser, setCurrentUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const navigation = [
    { name: 'Дашборд', href: '/', icon: LayoutDashboard },
    { name: 'Медиаплан', href: '/mediaplan', icon: ClipboardList },
    { name: 'Встречи', href: '/meetings', icon: CalendarClock },
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
            <div className="flex items-center min-w-0">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:hidden mr-1 shrink-0"
                    aria-label="Открыть меню"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100vw,20rem)]">
                  <SheetHeader>
                    <SheetTitle>Разделы</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                            isActive ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                  <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
                    Планёр встреч — отдельная вкладка с недельной сеткой по времени.
                  </p>
                </SheetContent>
              </Sheet>
              <div className="flex-shrink-0 flex items-center min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">Медиапланирование</h1>
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
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
