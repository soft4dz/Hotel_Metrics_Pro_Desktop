import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: number;
  titre: string;
  message: string;
  lien: string | null;
  lu: boolean;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const count = unwrapIpc(await ipcClient.notifications.countUnread());
      setUnread(count);
      if (open) {
        const list = unwrapIpc(await ipcClient.notifications.list(false, 10)) as NotificationItem[];
        setItems(list);
      }
    } catch {
      setUnread(0);
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const markRead = async (id: number) => {
    await ipcClient.notifications.markRead(id);
    void refresh();
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white md:h-9 md:w-9"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
          <div className="border-b px-3 py-2 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Aucune notification</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    'block w-full border-b px-3 py-2.5 text-left text-xs hover:bg-muted/50',
                    !n.lu && 'bg-primary/5',
                  )}
                  onClick={() => {
                    void markRead(n.id);
                    if (n.lien) {
                      setOpen(false);
                      navigate(n.lien);
                    }
                  }}
                >
                  <p className="font-medium text-foreground">{n.titre}</p>
                  <p className="mt-0.5 text-muted-foreground line-clamp-2">{n.message}</p>
                </button>
              ))
            )}
          </div>
          <div className="p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); navigate('/settings/notifications'); }}>
              Tout voir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
