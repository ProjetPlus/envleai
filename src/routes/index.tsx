import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Menu, Plus, Send, Download, Image as ImgIcon, Trash2, MessageSquare,
  Copy, Share2, RotateCcw, Edit3, Folder, Upload, X, LogOut, User,
  Paperclip, Globe, Library, FileText, Loader2, Search,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/envle-logo.png";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chatWithEnvle } from "@/lib/chat.functions";
import { webSearch } from "@/lib/webSearch.functions";
import { exportChatPdf, exportChatTxt } from "@/lib/exportChat";
import type { Msg } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { OnboardingDialog } from "@/components/OnboardingDialog";

export const Route = createFileRoute("/")({
  ssr: false,
  component: App,
});

type Project = { id: string; name: string; description: string | null };
type Thread = { id: string; title: string; project_id: string | null; updated_at: string };
type ProjectFile = { id: string; name: string; mime_type: string | null; storage_path: string };

function App() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [initialName, setInitialName] = useState<string | undefined>();

  useEffect(() => {
    const init = async (uid: string | null, mail: string | null) => {
      setUserId(uid);
      setEmail(mail);
      if (uid) {
        const { data } = await supabase
          .from("profiles")
          .select("onboarded, display_name")
          .eq("id", uid)
          .maybeSingle();
        setInitialName(data?.display_name ?? undefined);
        setNeedsOnboarding(!data?.onboarded);
      }
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => {
      init(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      init(session?.user.id ?? null, session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!userId) return <AuthScreen />;

  return (
    <>
      <Workspace userId={userId} email={email ?? ""} />
      {needsOnboarding && (
        <OnboardingDialog
          open
          userId={userId}
          initialName={initialName}
          onDone={() => setNeedsOnboarding(false)}
        />
      )}
    </>
  );
}

// ---------------- AUTH ----------------
function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [mail, setMail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onEmail = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: mail,
          password: pw,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || mail.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vérifie tes mails si la confirmation est demandée.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
        if (error) throw error;
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Connexion Google: " + (res.error as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="E'nvlé AI" className="h-20 w-auto" />
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            L'intelligence artificielle africaine
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer un compte</TabsTrigger>
          </TabsList>
          <TabsContent value="signup" className="space-y-3 pt-4">
            <div>
              <Label htmlFor="au-name">Prénom</Label>
              <Input id="au-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>
        <div className="space-y-3 pt-2">
          <div>
            <Label htmlFor="au-mail">Email</Label>
            <Input id="au-mail" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="au-pw">Mot de passe</Label>
            <Input id="au-pw" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <Button onClick={onEmail} disabled={busy || !mail || !pw} className="w-full">
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          <Button onClick={onGoogle} disabled={busy} variant="outline" className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>
            Continuer avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------- WORKSPACE ----------------
function Workspace({ userId, email }: { userId: string; email: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "image" | "files">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects").select("id,name,description").order("created_at", { ascending: true });
    const list = (data ?? []) as Project[];
    setProjects(list);
    if (list.length && !activeProjectId) setActiveProjectId(list[0].id);
  }, [activeProjectId]);

  const loadThreads = useCallback(async () => {
    if (!activeProjectId) { setThreads([]); return; }
    const { data } = await supabase
      .from("threads").select("id,title,project_id,updated_at")
      .eq("project_id", activeProjectId)
      .order("updated_at", { ascending: false });
    setThreads((data ?? []) as Thread[]);
  }, [activeProjectId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadThreads(); }, [loadThreads]);

  const newProject = async () => {
    const name = prompt("Nom du nouveau projet ?");
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from("projects").insert({ user_id: userId, name: name.trim() }).select().single();
    if (error) { toast.error(error.message); return; }
    await loadProjects();
    setActiveProjectId((data as Project).id);
    setActiveThreadId(null);
  };

  const newThread = async () => {
    if (!activeProjectId) { toast.error("Crée d'abord un projet"); return; }
    const { data, error } = await supabase
      .from("threads").insert({ user_id: userId, project_id: activeProjectId, title: "Nouvelle conversation" }).select().single();
    if (error) { toast.error(error.message); return; }
    await loadThreads();
    setActiveThreadId((data as Thread).id);
    setView("chat");
    setSidebarOpen(false);
  };

  const removeThread = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await supabase.from("threads").delete().eq("id", id);
    if (activeThreadId === id) setActiveThreadId(null);
    loadThreads();
  };

  const removeProject = async (id: string) => {
    if (!confirm("Supprimer ce projet et toutes ses conversations ?")) return;
    await supabase.from("projects").delete().eq("id", id);
    if (activeProjectId === id) { setActiveProjectId(null); setActiveThreadId(null); }
    loadProjects();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-40 w-72" : "hidden"} md:relative md:block md:w-72 border-r bg-card`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <img src={logo} alt="E'nvlé AI" className="h-8 w-auto" />
            <span className="text-sm font-semibold tracking-tight">E'nvlé AI</span>
            <button className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projets</span>
              <button onClick={newProject} className="rounded p-1 hover:bg-accent" aria-label="Nouveau projet">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="mb-4 space-y-1">
              {projects.map((p) => (
                <li key={p.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => { setActiveProjectId(p.id); setActiveThreadId(null); }}
                    className={`flex-1 truncate rounded px-2 py-1.5 text-left text-sm ${activeProjectId === p.id ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                  >
                    <Folder className="mr-2 inline h-3.5 w-3.5" />{p.name}
                  </button>
                  <button onClick={() => removeProject(p.id)} className="opacity-0 group-hover:opacity-100" aria-label="Supprimer projet">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </li>
              ))}
            </ul>

            {activeProjectId && (
              <>
                <div className="mb-2 mt-4 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</span>
                  <button onClick={newThread} className="rounded p-1 hover:bg-accent" aria-label="Nouvelle conversation">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <ul className="space-y-1">
                  {threads.map((t) => (
                    <li key={t.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => { setActiveThreadId(t.id); setView("chat"); setSidebarOpen(false); }}
                        className={`flex-1 truncate rounded px-2 py-1.5 text-left text-sm ${activeThreadId === t.id ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                      >
                        <MessageSquare className="mr-2 inline h-3.5 w-3.5" />{t.title}
                      </button>
                      <button onClick={() => removeThread(t.id)} className="opacity-0 group-hover:opacity-100" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  ))}
                  {threads.length === 0 && (
                    <li className="px-2 py-1 text-xs text-muted-foreground">Aucune conversation. Clique sur +</li>
                  )}
                </ul>
              </>
            )}
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" /><span className="truncate">{email}</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />Se déconnecter
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="truncate text-sm font-medium">{activeProject?.name ?? "Aucun projet"}</div>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant={view === "chat" ? "secondary" : "ghost"} onClick={() => setView("chat")}>
              <MessageSquare className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Chat</span>
            </Button>
            <Button size="sm" variant={view === "image" ? "secondary" : "ghost"} onClick={() => setView("image")}>
              <ImgIcon className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Image</span>
            </Button>
            <Button size="sm" variant={view === "files" ? "secondary" : "ghost"} onClick={() => setView("files")} disabled={!activeProjectId}>
              <Folder className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Fichiers</span>
            </Button>
          </div>
        </header>

        {view === "chat" && (
          <ChatView
            userId={userId}
            projectId={activeProjectId}
            threadId={activeThreadId}
            onCreateThread={async () => {
              if (!activeProjectId) { toast.error("Crée d'abord un projet"); return null; }
              const { data } = await supabase.from("threads")
                .insert({ user_id: userId, project_id: activeProjectId, title: "Nouvelle conversation" })
                .select().single();
              const id = (data as Thread).id;
              setActiveThreadId(id);
              loadThreads();
              return id;
            }}
            onTitleChange={loadThreads}
          />
        )}
        {view === "image" && <ImageStudio userId={userId} />}
        {view === "files" && activeProjectId && <FilesView userId={userId} projectId={activeProjectId} />}
      </main>
    </div>
  );
}

// ---------------- CHAT ----------------
function ChatView({
  userId, projectId, threadId, onCreateThread, onTitleChange,
}: {
  userId: string;
  projectId: string | null;
  threadId: string | null;
  onCreateThread: () => Promise<string | null>;
  onTitleChange: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const chatFn = useServerFn(chatWithEnvle);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);

  useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at")
      .then(({ data }) => {
        setMessages((data ?? []).map((r) => ({
          id: r.id, role: r.role as Msg["role"], content: r.content, createdAt: r.created_at,
        })));
      });
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (overrideText?: string, regenerate = false) => {
    const text = (overrideText ?? input).trim();
    if (!text && !regenerate) return;
    if (busy) return;

    let tid = threadId;
    if (!tid) {
      tid = await onCreateThread();
      if (!tid) return;
    }

    let nextMessages = messages;
    if (!regenerate) {
      const { data: inserted } = await supabase.from("messages")
        .insert({ user_id: userId, thread_id: tid, role: "user", content: text })
        .select().single();
      const userMsg: Msg = inserted
        ? { id: inserted.id, role: "user", content: text, createdAt: inserted.created_at }
        : { role: "user", content: text };
      nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      if (messages.length === 0) {
        const title = text.slice(0, 60);
        await supabase.from("threads").update({ title }).eq("id", tid);
        onTitleChange();
      }
    }

    setBusy(true);
    try {
      const payload = nextMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatFn({ data: { messages: payload, threadId: tid, projectId: projectId ?? undefined } });
      const { data: inserted } = await supabase.from("messages")
        .insert({ user_id: userId, thread_id: tid, role: "assistant", content: res.reply })
        .select().single();
      const aMsg: Msg = inserted
        ? { id: inserted.id, role: "assistant", content: res.reply, createdAt: inserted.created_at }
        : { role: "assistant", content: res.reply };
      setMessages([...nextMessages, aMsg]);
      await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
      onTitleChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const deleteMsg = async (id?: string) => {
    if (!id) return;
    await supabase.from("messages").delete().eq("id", id);
    setMessages(messages.filter((m) => m.id !== id));
  };

  const regenerate = async () => {
    // remove last assistant message and re-send
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.id) return;
    await supabase.from("messages").delete().eq("id", last.id);
    const without = messages.filter((m) => m.id !== last.id);
    setMessages(without);
    await send(undefined, true);
  };

  const startEdit = (m: Msg) => { setEditingId(m.id ?? null); setEditValue(m.content); };
  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("messages").update({ content: editValue }).eq("id", editingId);
    setMessages(messages.map((m) => m.id === editingId ? { ...m, content: editValue } : m));
    setEditingId(null);
  };

  const shareMsg = async (content: string) => {
    if (navigator.share) {
      try { await navigator.share({ title: "E'nvlé AI", text: content }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(content);
    toast.success("Copié dans le presse-papiers");
  };

  const title = messages[0]?.content?.slice(0, 40) || "Conversation";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="rounded-xl border bg-card p-6 text-center">
              <img src={logo} alt="" className="mx-auto h-16 w-auto" />
              <h2 className="mt-3 text-xl font-semibold">Bienvenue sur E'nvlé AI</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pose ta question, demande un texte, un plan, un résumé… ou bascule sur « Image » pour générer.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`group rounded-xl border p-4 ${m.role === "user" ? "bg-accent/40" : "bg-card"}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.role === "user" ? "Toi" : "E'nvlé AI"}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconBtn label="Copier" onClick={async () => { await navigator.clipboard.writeText(m.content); toast.success("Copié"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn label="Partager" onClick={() => shareMsg(m.content)}>
                    <Share2 className="h-3.5 w-3.5" />
                  </IconBtn>
                  {m.role === "user" && (
                    <IconBtn label="Modifier" onClick={() => startEdit(m)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                  {m.role === "assistant" && i === messages.length - 1 && !busy && (
                    <IconBtn label="Régénérer" onClick={regenerate}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </IconBtn>
                  )}
                  <IconBtn label="Supprimer" onClick={() => deleteMsg(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
              {editingId === m.id ? (
                <div className="space-y-2">
                  <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={4} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Enregistrer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : m.role === "assistant" ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              )}
            </div>
          ))}
          {busy && (
            <div className="rounded-xl border bg-card p-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">E'nvlé AI</span>
              <div className="mt-2 flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-card px-3 py-3 md:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Pose ta question à E'nvlé AI…"
            rows={1}
            className="min-h-[44px] max-h-40 resize-none"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={messages.length === 0} aria-label="Exporter">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportChatPdf(title, messages)}>Exporter en PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChatTxt(title, messages)}>Exporter en TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon" aria-label="Envoyer">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}

// ---------------- IMAGE STUDIO ----------------
function ImageStudio({ userId }: { userId: string }) {
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const addRef = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setRefs((r) => [...r, reader.result as string]);
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImages: refs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      setResult(json.imageUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `envle-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold">Studio d'image</h2>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
          placeholder="Décris l'image (sujet, ambiance, style)…" />
        <div>
          <Label className="text-xs">Photos de référence (optionnel)</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {refs.map((r, i) => (
              <div key={i} className="relative">
                <img src={r} alt="" className="h-20 w-20 rounded object-cover" />
                <button onClick={() => setRefs(refs.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
              <Upload className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) addRef(f); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        <Button onClick={generate} disabled={busy || !prompt.trim()}>
          {busy ? "Génération…" : "Générer l'image"}
        </Button>
        {result && (
          <div className="rounded-xl border bg-card p-3">
            <img src={result} alt="Résultat" className="mx-auto max-h-[60vh] rounded" />
            <Button onClick={download} variant="outline" className="mt-3">
              <Download className="mr-2 h-4 w-4" />Télécharger
            </Button>
          </div>
        )}
      </div>
      {/* userId unused for now; suppress eslint */}
      <span className="hidden">{userId}</span>
    </div>
  );
}

// ---------------- FILES ----------------
function FilesView({ userId, projectId }: { userId: string; projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("project_files")
      .select("id,name,mime_type,storage_path")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setFiles((data ?? []) as ProjectFile[]);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    const path = `${userId}/${projectId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-files").upload(path, file);
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const kind = file.type.startsWith("image") ? "image"
      : file.type.startsWith("video") ? "video"
      : "document";
    const { error } = await supabase.from("project_files").insert({
      user_id: userId, project_id: projectId, name: file.name,
      mime_type: file.type, size_bytes: file.size, storage_path: path, kind,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Fichier ajouté"); load(); }
  };

  const remove = async (f: ProjectFile) => {
    if (!confirm(`Supprimer ${f.name} ?`)) return;
    await supabase.storage.from("project-files").remove([f.storage_path]);
    await supabase.from("project_files").delete().eq("id", f.id);
    load();
  };

  const download = async (f: ProjectFile) => {
    const { data, error } = await supabase.storage.from("project-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data) { toast.error("Téléchargement impossible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold">Fichiers du projet</h2>
        <p className="text-sm text-muted-foreground">
          Documents, images et vidéos rattachés au projet. L'IA pourra les consulter dans les futures mises à jour.
        </p>
        <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-8 hover:border-primary">
          <div className="text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-2 text-sm">{busy ? "Envoi…" : "Cliquer pour téléverser"}</div>
          </div>
          <input type="file" className="hidden" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <ul className="divide-y rounded-lg border bg-card">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <button onClick={() => download(f)} className="rounded p-1 hover:bg-accent" aria-label="Télécharger">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={() => remove(f)} className="rounded p-1 hover:bg-accent" aria-label="Supprimer">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </li>
          ))}
          {files.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">Aucun fichier</li>
          )}
        </ul>
      </div>
    </div>
  );
}
