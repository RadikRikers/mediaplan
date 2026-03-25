import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router';
import { useStore, type CloudSyncStatus } from '../store';
import { isRemoteSyncConfigured } from '../api/backend';
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
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { permissionLabels, displayTaskTypeLabel } from '../types';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/mediaplan': 'Медиаплан',
  '/meetings': 'Встречи',
  '/calendar': 'Календарь',
  '/team': 'Команда',
  '/archive': 'Архив',
  '/account': 'Аккаунт',
};

function CloudSyncIndicator({ status }: { status: CloudSyncStatus }) {
  if (status === 'off') return null;
  const cfg =
    status === 'loading'
      ? { Icon: Loader2, className: 'text-slate-500 animate-spin', hint: 'Загрузка данных из облака…' }
      : status === 'error'
        ? { Icon: CloudOff, className: 'text-red-600', hint: 'Ошибка синхронизации. Проверьте сеть и Supabase.' }
        : { Icon: Cloud, className: 'text-emerald-600', hint: 'Данные синхронизированы с Supabase' };
  const { Icon, className, hint } = cfg;
  return (
    <span
      className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shrink-0"
      title={hint}
    >
      <Icon className={cn('h-3.5 w-3.5 sm:mr-1.5', className)} aria-hidden />
      <span className="sr-only">{hint}</span>
      <span className="max-w-[7rem] truncate hidden md:inline">
        {status === 'loading' ? 'Синхронизация…' : status === 'error' ? 'Ошибка' : 'Облако'}
      </span>
    </span>
  );
}

export default function Layout() {
  const { currentUser, jobPositions, setCurrentUser, cloudSyncStatus } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const product = 'Медиапланирование';
    const page = PAGE_TITLES[location.pathname];
    document.title = page ? `${page} · ${product}` : product;
  }, [location.pathname]);

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
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          end={item.href === '/'}
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50',
                            )
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.name}
                        </NavLink>
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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-6 lg:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) =>
                        cn(
                          'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-blue-600 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 mr-2 shrink-0" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {currentUser && isRemoteSyncConfigured() && (
                <CloudSyncIndicator status={cloudSyncStatus} />
              )}
              {currentUser && (
                <>
                  <div className="text-sm text-right min-w-0">
                    <div className="font-medium text-gray-900 truncate max-w-[10rem] sm:max-w-none">
                      {currentUser.name}
                    </div>
                    <div className="text-gray-500 truncate max-w-[10rem] sm:max-w-[14rem]">
                      {displayTaskTypeLabel(currentUser, jobPositions)}
                    </div>
                    <div className="text-xs text-gray-400">{permissionLabels[currentUser.permissionLevel]}</div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Выход
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-4rem)] border-t border-slate-100/80 bg-slate-50/50">
        <Outlet />
      </main>
    </div>
  );
}
