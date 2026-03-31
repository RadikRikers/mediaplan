import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router';
import { useStore, type CloudSyncStatus } from '../store';
import { CommandPalette } from './CommandPalette';
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
  LayoutGrid,
  BarChart3,
  MessageSquare,
  GraduationCap,
  Moon,
  Sun,
  Search,
} from 'lucide-react';
import { permissionLabels, displayTaskTypeLabel } from '../types';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import {
  canAccessMediaWorkloadNav,
  canAccessAnalyticsSection,
  canAccessFeedbackSection,
  canAccessLearningSection,
} from '../utils/permissions';
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
  '/contentplan': 'Контент план',
  '/analytics': 'Аналитика',
  '/feedback': 'Обратная связь',
  '/learning': 'Обучение',
  '/team': 'Команда',
  '/archive': 'Архив',
  '/account': 'Аккаунт',
};

const NAV_PRIMARY_BASE = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard },
  { name: 'Медиаплан', href: '/mediaplan', icon: ClipboardList },
  { name: 'Встречи', href: '/meetings', icon: CalendarClock },
  { name: 'Календарь', href: '/calendar', icon: Calendar },
  { name: 'Контент план', href: '/contentplan', icon: LayoutGrid },
] as const;

const NAV_SECONDARY_BASE = [
  { name: 'Команда', href: '/team', icon: Users },
  { name: 'Архив', href: '/archive', icon: Archive },
  { name: 'Аккаунт', href: '/account', icon: KeyRound },
] as const;

function CloudSyncIndicator({ status }: { status: CloudSyncStatus }) {
  if (status === 'off') return null;
  const cfg =
    status === 'loading'
      ? { Icon: Loader2, className: 'text-slate-500 animate-spin', hint: 'Загрузка данных из облака…' }
      : status === 'saving'
        ? { Icon: Loader2, className: 'text-amber-600 animate-spin', hint: 'Сохраняем изменения в Supabase…' }
        : status === 'error'
          ? { Icon: CloudOff, className: 'text-red-600', hint: 'Ошибка синхронизации. Проверьте сеть и Supabase.' }
          : { Icon: Cloud, className: 'text-emerald-600', hint: 'Данные синхронизированы с Supabase' };
  const { Icon, className, hint } = cfg;
  return (
    <span
      className="hidden sm:inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground shrink-0"
      title={hint}
    >
      <Icon className={cn('h-3.5 w-3.5 sm:mr-1.5', className)} aria-hidden />
      <span className="sr-only">{hint}</span>
      <span className="max-w-[7rem] truncate hidden md:inline">
        {status === 'loading'
          ? 'Синхронизация…'
          : status === 'saving'
            ? 'Запись…'
            : status === 'error'
              ? 'Ошибка'
              : 'Облако'}
      </span>
    </span>
  );
}

export default function Layout() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { currentUser, jobPositions, staffBlocks, setCurrentUser, cloudSyncStatus } = useStore();
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

  const navigationPrimary = useMemo(() => {
    if (!currentUser) return [...NAV_PRIMARY_BASE];
    const allowMedia = canAccessMediaWorkloadNav(currentUser, staffBlocks);
    return NAV_PRIMARY_BASE.filter((item) => {
      if (item.href === '/mediaplan' || item.href === '/contentplan') return allowMedia;
      return true;
    });
  }, [currentUser, staffBlocks]);

  const navigationSecondary = useMemo(() => {
    if (!currentUser) return [...NAV_SECONDARY_BASE];
    const allowMedia = canAccessMediaWorkloadNav(currentUser, staffBlocks);
    return NAV_SECONDARY_BASE.filter((item) => {
      if (item.href === '/archive') return allowMedia;
      return true;
    });
  }, [currentUser, staffBlocks]);

  const navigationInsights = useMemo(() => {
    if (!currentUser) return [];
    const items: { name: string; href: string; icon: typeof BarChart3 }[] = [];
    if (canAccessAnalyticsSection(currentUser, staffBlocks)) {
      items.push({ name: 'Аналитика', href: '/analytics', icon: BarChart3 });
    }
    if (canAccessFeedbackSection(currentUser, staffBlocks)) {
      items.push({ name: 'Обратная связь', href: '/feedback', icon: MessageSquare });
    }
    if (canAccessLearningSection(currentUser, staffBlocks)) {
      items.push({ name: 'Обучение', href: '/learning', icon: GraduationCap });
    }
    return items;
  }, [currentUser, staffBlocks]);

  const navigationDesktop = useMemo(
    () => [...navigationPrimary, ...navigationInsights, ...navigationSecondary],
    [navigationPrimary, navigationInsights, navigationSecondary],
  );

  const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center border-b-2 pb-2 text-sm font-medium transition-colors shrink-0',
      isActive
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
    );

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommandPalette />
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Строка 1: мобильное меню, название, облако, профиль */}
          <div className="flex justify-between items-center gap-3 py-3 min-h-14">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                    aria-label="Открыть меню"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100vw,20rem)]">
                  <SheetHeader>
                    <SheetTitle>Разделы</SheetTitle>
                  </SheetHeader>
                  <p className="text-xs font-medium text-muted-foreground mt-4 mb-1">Работа</p>
                  <nav className="flex flex-col gap-1">
                    {navigationPrimary.map((item) => {
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
                  {navigationInsights.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-1">
                        Аналитика и развитие
                      </p>
                      <nav className="flex flex-col gap-1">
                        {navigationInsights.map((item) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.name}
                              to={item.href}
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
                    </>
                  )}
                  <p className="text-xs font-medium text-muted-foreground mt-4 mb-1">Команда и профиль</p>
                  <nav className="flex flex-col gap-1">
                    {navigationSecondary.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
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
                    Планер встреч — недельная сетка по времени.
                  </p>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate min-w-0">
                Медиапланирование
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {currentUser && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    aria-label="Поиск"
                    title="Поиск (⌘K)"
                    onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    aria-label="Тема"
                    onClick={toggleTheme}
                    title={theme === 'system' ? 'Тема: как в системе' : theme === 'dark' ? 'Тёмная' : 'Светлая'}
                  >
                    {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </>
              )}
              {currentUser && isRemoteSyncConfigured() && (
                <CloudSyncIndicator status={cloudSyncStatus} />
              )}
              {currentUser && (
                <>
                  <div
                    className="text-xs sm:text-sm text-right min-w-0 max-w-[9rem] sm:max-w-[12rem] md:max-w-[15rem]"
                    title={`${currentUser.name} · ${displayTaskTypeLabel(currentUser, jobPositions)} · ${permissionLabels[currentUser.permissionLevel]}`}
                  >
                    <div className="font-medium text-foreground truncate">{currentUser.name}</div>
                    <div className="text-muted-foreground truncate hidden sm:block text-xs">
                      {displayTaskTypeLabel(currentUser, jobPositions)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground/80 truncate">
                      {permissionLabels[currentUser.permissionLevel]}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 px-2 sm:px-3" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Выход</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Строка 2 (desktop): основные разделы + команда/архив/аккаунт */}
          <div className="hidden md:flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border py-2.5">
            {navigationDesktop.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.name} to={item.href} end={item.href === '/'} className={desktopNavLinkClass}>
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-7rem)] md:min-h-[calc(100vh-11rem)] border-t border-border/80 bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
