import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../store';
import { withoutGhostServiceUser } from '../constants/serviceAccount';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';
import { filterTasksByPermissions, filterUsersByPermissions } from '../utils/permissions';
import { ClipboardList, LayoutDashboard, Users, UserCircle } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tasks, users, currentUser, staffBlocks } = useStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'к') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEvt = () => setOpen(true);
    document.addEventListener('keydown', down);
    window.addEventListener('open-command-palette', openEvt as EventListener);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-palette', openEvt as EventListener);
    };
  }, []);

  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    return withoutGhostServiceUser(filterUsersByPermissions(users, currentUser, staffBlocks));
  }, [users, currentUser, staffBlocks]);

  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    return filterTasksByPermissions(tasks, currentUser, users, staffBlocks);
  }, [tasks, currentUser, users, staffBlocks]);

  const taskHits = useMemo(() => {
    return [...visibleTasks]
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
      .slice(0, 12);
  }, [visibleTasks]);

  const userHits = useMemo(() => {
    return [...visibleUsers].sort((a, b) => a.name.localeCompare(b.name, 'ru')).slice(0, 12);
  }, [visibleUsers]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Поиск" description="Задачи, люди, разделы">
      <CommandInput placeholder="Задача, сотрудник или раздел…" />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        <CommandGroup heading="Разделы">
          <CommandItem onSelect={() => go('/')}>
            <LayoutDashboard className="text-muted-foreground" />
            Дашборд
          </CommandItem>
          <CommandItem onSelect={() => go('/mediaplan')}>
            <ClipboardList className="text-muted-foreground" />
            Медиаплан
          </CommandItem>
          <CommandItem onSelect={() => go('/team')}>
            <Users className="text-muted-foreground" />
            Команда
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Задачи">
          {taskHits.map((t) => (
            <CommandItem key={t.id} value={`${t.title} ${t.id}`} onSelect={() => go('/mediaplan')}>
              <ClipboardList className="text-muted-foreground" />
              <span className="truncate">{t.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Сотрудники">
          {userHits.map((u) => (
            <CommandItem key={u.id} value={`${u.name} ${u.id}`} onSelect={() => go('/team')}>
              <UserCircle className="text-muted-foreground" />
              <span className="truncate">{u.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
