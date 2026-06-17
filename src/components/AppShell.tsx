import { Link, useNavigate, useParams } from "@tanstack/react-router";
import logo from "@/assets/envle-logo.png";
import { useEffect, useState, type ReactNode } from "react";
import { createThread, deleteThread, listThreads, type Thread } from "@/lib/threads";
import { Menu, Plus, MessageSquare, Image as ImgIcon, FileText, Trash2, History } from "lucide-react";

export function AppShell({ children, activeThreadId }: { children: ReactNode; activeThreadId?: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setThreads(listThreads());
    refresh();
    window.addEventListener("envle:threads-changed", refresh);
    return () => window.removeEventListener("envle:threads-changed", refresh);
  }, []);

  function onNew() {
    const t = createThread();
    setOpen(false);
    navigate({ to: "/c/$threadId", params: { threadId: t.id } });
  }

  return (
    <div className="flex h-dvh w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <img src={logo} alt="E'nvlé IA" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <div className="text-sm font-bold">E&apos;nvlé IA</div>
            <div className="text-[10px] text-muted-foreground">L&apos;IA africaine</div>
          </div>
        </div>
        <button
          onClick={onNew}
          className="mx-3 mt-1 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-background py-2 text-sm font-medium hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> Nouvelle discussion
        </button>

        <nav className="mt-4 flex flex-col gap-1 px-3 text-sm">
          <SideLink to="/" icon={<MessageSquare className="h-4 w-4" />} label="Accueil" onClick={() => setOpen(false)} />
          <SideLink to="/images" icon={<ImgIcon className="h-4 w-4" />} label="Images" onClick={() => setOpen(false)} />
          <SideLink to="/documents" icon={<FileText className="h-4 w-4" />} label="Documents" onClick={() => setOpen(false)} />
          <SideLink to="/history" icon={<History className="h-4 w-4" />} label="Historique" onClick={() => setOpen(false)} />
        </nav>

        <div className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Discussions
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {threads.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">Aucune discussion encore.</div>
          )}
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center">
                <Link
                  to="/c/$threadId"
                  params={{ threadId: t.id }}
                  onClick={() => setOpen(false)}
                  className={`flex-1 truncate rounded-md px-2 py-1.5 text-sm ${
                    activeThreadId === t.id
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {t.title}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm("Supprimer cette discussion ?")) {
                      deleteThread(t.id);
                      if (activeThreadId === t.id) navigate({ to: "/" });
                    }
                  }}
                  className="mr-1 opacity-0 transition group-hover:opacity-100"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          Mémoire locale · Tes discussions restent sur ce navigateur.
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-secondary"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          <div className="text-sm font-semibold">E&apos;nvlé IA</div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function SideLink({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "flex items-center gap-2 rounded-md px-2 py-1.5 bg-secondary text-foreground" }}
    >
      {icon} <span>{label}</span>
    </Link>
  );
}