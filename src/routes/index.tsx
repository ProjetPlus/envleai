import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Menu, Plus, Send, Download, Image as ImgIcon, Trash2, MessageSquare,
  Copy, Share2, RotateCcw, Edit3, Folder, X, LogOut, User,
  Paperclip, Library, FileText, Loader2, Search, ShieldCheck,
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
import type { MsgVersion } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { OnboardingDialog } from "@/components/OnboardingDialog";

export const Route = createFileRoute("/")({
  ssr: false,
  component: App,
});

type Project = { id: string; name: string; description: string | null };
type Thread = { id: string; title: string; project_id: string | null; updated_at: string };
// (Fichiers projet: gérés via la Bibliothèque)

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
  const [view, setView] = useState<"chat" | "library">("chat");
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
            <Button size="sm" variant={view === "library" ? "secondary" : "ghost"} onClick={() => setView("library")}>
              <Library className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Bibliothèque</span>
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
        {view === "library" && <LibraryView userId={userId} projects={projects} />}
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
  // Currently-displayed version index per message id. undefined => latest.
  const [versionView, setVersionView] = useState<Record<string, number>>({});
  const chatFn = useServerFn(chatWithEnvle);
  const searchFn = useServerFn(webSearch);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState<
    Array<{ kind: "image" | "doc"; name: string; dataUrl?: string; text?: string; mime: string }>
  >([]);
  const [imageMode, setImageMode] = useState(false);
  const [strictMode, setStrictMode] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);

  useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at")
      .then(({ data }) => {
        setMessages((data ?? []).map((r) => ({
          id: r.id, role: r.role as Msg["role"], content: r.content, createdAt: r.created_at,
          attachments: (r.attachments as Msg["attachments"]) ?? null,
          versions: ((r.versions as unknown) as MsgVersion[] | null) ?? [],
        })));
      });
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const readFile = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const readText = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsText(f);
    });

  const onAttach = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > 15 * 1024 * 1024) { toast.error(`${f.name} > 15 Mo`); continue; }
      if (f.type.startsWith("image/")) {
        const dataUrl = await readFile(f);
        setPending((p) => [...p, { kind: "image", name: f.name, dataUrl, mime: f.type }]);
      } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        const dataUrl = await readFile(f);
        setPending((p) => [...p, { kind: "doc", name: f.name, dataUrl, mime: "application/pdf" }]);
      } else if (f.type.startsWith("text/") || /\.(txt|md|csv|json|log|html|xml|yaml|yml|tsv)$/i.test(f.name)) {
        const text = await readText(f);
        setPending((p) => [...p, { kind: "doc", name: f.name, text: text.slice(0, 60000), mime: f.type || "text/plain" }]);
      } else {
        toast.error(`Type non pris en charge: ${f.name}. Formats acceptés : images, PDF, texte (txt, md, csv, json…).`);
      }
    }
  };

  const generateImage = async (tid: string, promptText: string) => {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptText,
        referenceImages: pending.filter((p) => p.kind === "image" && p.dataUrl).map((p) => p.dataUrl!),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erreur image");
    const url: string = json.imageUrl;
    const content = `Voici l'image générée pour : « ${promptText} »`;
    const attach = [{ kind: "image" as const, dataUrl: url }];
    const { data: inserted } = await supabase.from("messages")
      .insert({ user_id: userId, thread_id: tid, role: "assistant", content, attachments: attach })
      .select().single();
    return inserted
      ? { id: inserted.id, role: "assistant" as const, content, attachments: attach, createdAt: inserted.created_at }
      : { role: "assistant" as const, content, attachments: attach };
  };

  const send = async (overrideText?: string, regenerate = false, baseMessages?: Msg[]) => {
    const text = (overrideText ?? input).trim();
    if (!text && !regenerate && pending.length === 0) return;
    if (busy) return;

    let tid = threadId;
    if (!tid) {
      tid = await onCreateThread();
      if (!tid) return;
    }

    let nextMessages = baseMessages ?? messages;
    if (!regenerate) {
      // Toutes les pièces jointes visuelles (images + PDF) sont stockées en tant qu'attachments "image"
      // pour passage direct au modèle (Gemini accepte les data URLs application/pdf).
      const imgAttachments = pending.filter((p) => p.dataUrl)
        .map((p) => ({ kind: "image" as const, dataUrl: p.dataUrl! }));
      const docContext = pending.filter((p) => p.kind === "doc" && p.text)
        .map((p) => `\n\n[Document joint — ${p.name}]\n${p.text}`).join("");
      const fullText = text + docContext;
      const { data: inserted } = await supabase.from("messages")
        .insert({
          user_id: userId, thread_id: tid, role: "user", content: fullText,
          attachments: imgAttachments.length ? imgAttachments : null,
        })
        .select().single();
      const userMsg: Msg = inserted
        ? { id: inserted.id, role: "user", content: fullText, attachments: imgAttachments, createdAt: inserted.created_at }
        : { role: "user", content: fullText, attachments: imgAttachments };
      nextMessages = [...nextMessages, userMsg];
      setMessages(nextMessages);
      setInput("");
      if (nextMessages.filter((m) => m.role === "user").length === 1) {
        const title = (text || "Nouvelle conversation").slice(0, 60);
        await supabase.from("threads").update({ title }).eq("id", tid);
        onTitleChange();
      }
    }

    setBusy(true);
    try {
      // Image mode → generate an image directly
      if (imageMode && !regenerate) {
        const aMsg = await generateImage(tid, text || "Illustration professionnelle FHD");
        setMessages([...nextMessages, aMsg]);
      } else {
        // Recherche web AUTOMATIQUE et silencieuse à chaque tour non-image.
        let webContext = "";
        const query = text || nextMessages[nextMessages.length - 1]?.content?.slice(0, 400) || "";
        if (query) {
          try {
            const s = await searchFn({ data: { query, limit: 6 } });
            if (s.available) webContext = s.context;
          } catch { /* silencieux */ }
        }
        const payload = nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
          imageUrls: m.attachments?.filter((a) => a.kind === "image").map((a) => a.dataUrl) ?? undefined,
        }));
        const res = await chatFn({ data: {
          messages: payload, threadId: tid, projectId: projectId ?? undefined,
          webSearchContext: webContext || undefined,
          strictMode,
        } });
        const { data: inserted } = await supabase.from("messages")
          .insert({ user_id: userId, thread_id: tid, role: "assistant", content: res.reply })
          .select().single();
        const aMsg: Msg = inserted
          ? { id: inserted.id, role: "assistant", content: res.reply, createdAt: inserted.created_at }
          : { role: "assistant", content: res.reply };
        setMessages([...nextMessages, aMsg]);
      }
      await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
      onTitleChange();
      setPending([]);
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
    // Regenerate last assistant message in place, keeping previous content as a version.
    const lastIdx = [...messages].map((m) => m.role).lastIndexOf("assistant");
    if (lastIdx < 0) return;
    const last = messages[lastIdx];
    if (!last?.id) return;
    const priorVersion: MsgVersion = {
      content: last.content,
      attachments: last.attachments ?? null,
      createdAt: last.createdAt ?? new Date().toISOString(),
    };
    const priorVersions = [...(last.versions ?? []), priorVersion];
    const context = messages.slice(0, lastIdx);
    setBusy(true);
    try {
      let webContext = "";
      const rq = context[context.length - 1]?.content?.slice(0, 400) || "";
      if (rq) {
        try {
          const s = await searchFn({ data: { query: rq, limit: 6 } });
          if (s.available) webContext = s.context;
        } catch { /* silencieux */ }
      }
      const payload = context.map((m) => ({
        role: m.role, content: m.content,
        imageUrls: m.attachments?.filter((a) => a.kind === "image").map((a) => a.dataUrl) ?? undefined,
      }));
      const res = await chatFn({ data: {
        messages: payload, threadId: threadId ?? undefined, projectId: projectId ?? undefined,
        webSearchContext: webContext || undefined,
        strictMode,
      } });
      await supabase.from("messages")
        .update({ content: res.reply, versions: priorVersions as unknown as never })
        .eq("id", last.id);
      const updated: Msg = { ...last, content: res.reply, versions: priorVersions };
      const next = [...messages];
      next[lastIdx] = updated;
      setMessages(next);
      setVersionView((v) => { const c = { ...v }; delete c[last.id!]; return c; });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (m: Msg) => { setEditingId(m.id ?? null); setEditValue(m.content); };
  const saveEdit = async () => {
    if (!editingId) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx < 0) { setEditingId(null); return; }
    const edited = messages[idx];
    // Snapshot old content as a version, then update in place.
    const priorVersion: MsgVersion = {
      content: edited.content,
      attachments: edited.attachments ?? null,
      createdAt: edited.createdAt ?? new Date().toISOString(),
    };
    const nextVersions = [...(edited.versions ?? []), priorVersion];
    await supabase.from("messages")
      .update({ content: editValue, versions: nextVersions as unknown as never })
      .eq("id", editingId);
    // Delete every message AFTER this one (they refer to the old content).
    const toDelete = messages.slice(idx + 1).map((m) => m.id).filter(Boolean) as string[];
    if (toDelete.length) await supabase.from("messages").delete().in("id", toDelete);
    const kept: Msg[] = messages.slice(0, idx + 1).map((m) =>
      m.id === editingId ? { ...m, content: editValue, versions: nextVersions } : m
    );
    setMessages(kept);
    setEditingId(null);
    setVersionView((v) => { const c = { ...v }; delete c[editingId]; return c; });
    // If user message was edited, relaunch generation
    if (edited.role === "user") {
      await send(undefined, true, kept);
    }
  };

  const restoreVersion = async (m: Msg, versionIdx: number) => {
    if (!m.id || !m.versions || versionIdx < 0 || versionIdx >= m.versions.length) return;
    const target = m.versions[versionIdx];
    const currentAsVersion: MsgVersion = {
      content: m.content,
      attachments: m.attachments ?? null,
      createdAt: m.createdAt ?? new Date().toISOString(),
    };
    const newVersions = m.versions.map((v, i) => (i === versionIdx ? currentAsVersion : v));
    await supabase.from("messages")
      .update({ content: target.content, attachments: target.attachments ?? null, versions: newVersions as unknown as never })
      .eq("id", m.id);
    setMessages((prev) => prev.map((x) => x.id === m.id
      ? { ...x, content: target.content, attachments: target.attachments ?? null, versions: newVersions }
      : x));
    setVersionView((v) => { const c = { ...v }; delete c[m.id!]; return c; });
    toast.success("Version restaurée");
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
                Pose ta question, joins une image ou un document, active la recherche web, ou passe en mode image pour générer.
              </p>
            </div>
          )}
          {messages.map((m, i) => {
            const versions = m.versions ?? [];
            const totalVersions = versions.length + 1; // versions + current
            const currentIdx = m.id && versionView[m.id] !== undefined ? versionView[m.id] : versions.length;
            const isViewingOld = currentIdx < versions.length;
            const displayed = isViewingOld ? versions[currentIdx] : { content: m.content, attachments: m.attachments };
            return (
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
                    <Button size="sm" onClick={saveEdit}>
                      {m.role === "user" ? "Relancer" : "Enregistrer"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  {displayed.attachments && displayed.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {displayed.attachments.filter((a) => a.kind === "image").map((a, k) => (
                        <a key={k} href={a.dataUrl} target="_blank" rel="noreferrer">
                          <img src={a.dataUrl} alt="" className="max-h-64 rounded-lg border object-contain" />
                        </a>
                      ))}
                    </div>
                  )}
                  {m.role === "assistant"
                    ? <Markdown>{displayed.content}</Markdown>
                    : <div className="whitespace-pre-wrap text-sm">{displayed.content}</div>}
                  {totalVersions > 1 && m.id && (
                    <div className="mt-3 flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
                      <button
                        className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40"
                        disabled={currentIdx === 0}
                        onClick={() => setVersionView((v) => ({ ...v, [m.id!]: Math.max(0, currentIdx - 1) }))}
                        aria-label="Version précédente"
                      >◀</button>
                      <span>Version {currentIdx + 1} / {totalVersions}</span>
                      <button
                        className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40"
                        disabled={currentIdx >= totalVersions - 1}
                        onClick={() => setVersionView((v) => ({ ...v, [m.id!]: Math.min(totalVersions - 1, currentIdx + 1) }))}
                        aria-label="Version suivante"
                      >▶</button>
                      {isViewingOld && (
                        <button
                          className="ml-2 rounded px-2 py-0.5 hover:bg-accent"
                          onClick={() => restoreVersion(m, currentIdx)}
                        >Restaurer cette version</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            );
          })}
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
        <div className="mx-auto max-w-3xl space-y-2">
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((p, i) => (
                <div key={i} className="relative flex items-center gap-2 rounded-lg border bg-background px-2 py-1 text-xs">
                  {p.kind === "image" && p.dataUrl
                    ? <img src={p.dataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <span className="max-w-[10rem] truncate">{p.name}</span>
                  <button onClick={() => setPending((all) => all.filter((_, j) => j !== i))} aria-label="Retirer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1">
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border hover:bg-accent" title="Joindre">
                <Paperclip className="h-4 w-4" />
                <input type="file" multiple className="hidden"
                  accept="image/*,application/pdf,text/*,.pdf,.txt,.md,.csv,.json,.log,.html,.xml,.yaml,.yml,.tsv"
                  onChange={(e) => { onAttach(e.target.files); e.target.value = ""; }} />
              </label>
              <button
                onClick={() => setImageMode((v) => !v)}
                title="Mode génération d'image"
                className={`flex h-9 w-9 items-center justify-center rounded-md border ${imageMode ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}>
                <ImgIcon className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={imageMode
                ? "Décris l'image à générer, ou joins une image à modifier…"
                : "Pose ta question à E'nvlé AI — Shift+Entrée = nouvelle ligne"}
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
            <Button onClick={() => send()} disabled={busy || (!input.trim() && pending.length === 0)} size="icon" aria-label="Envoyer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
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

// ---------------- LIBRARY ----------------
type LibraryItem = {
  id: string;
  kind: "image" | "document" | "generated";
  name: string;
  url: string;
  projectId: string | null;
  projectName?: string;
  threadId: string | null;
  createdAt: string;
};

function LibraryView({ userId, projects }: { userId: string; projects: Project[] }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "document" | "generated">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const projectById = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  useEffect(() => {
    (async () => {
      const out: LibraryItem[] = [];

      // Uploaded assets in messages (image attachments in user messages)
      const { data: msgs } = await supabase
        .from("messages")
        .select("id,thread_id,attachments,created_at,role,threads(project_id)")
        .eq("user_id", userId)
        .not("attachments", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      for (const m of (msgs ?? []) as Array<{
        id: string; thread_id: string | null; attachments: Msg["attachments"];
        created_at: string; role: string; threads: { project_id: string | null } | null;
      }>) {
        (m.attachments ?? []).forEach((a, k) => {
          if (a.kind === "image") {
            out.push({
              id: `${m.id}-${k}`,
              kind: m.role === "assistant" ? "generated" : "image",
              name: m.role === "assistant" ? "Image générée" : "Image jointe",
              url: a.dataUrl,
              projectId: m.threads?.project_id ?? null,
              projectName: m.threads?.project_id ? projectById[m.threads.project_id] : undefined,
              threadId: m.thread_id,
              createdAt: m.created_at,
            });
          }
        });
      }

      // Uploaded project files
      const { data: files } = await supabase
        .from("project_files")
        .select("id,name,mime_type,storage_path,project_id,kind,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      for (const f of (files ?? []) as Array<{
        id: string; name: string; mime_type: string; storage_path: string;
        project_id: string; kind: string; created_at: string;
      }>) {
        const { data: signed } = await supabase.storage.from("project-files")
          .createSignedUrl(f.storage_path, 3600);
        out.push({
          id: f.id,
          kind: f.mime_type.startsWith("image/") ? "image" : "document",
          name: f.name,
          url: signed?.signedUrl ?? "",
          projectId: f.project_id,
          projectName: projectById[f.project_id],
          threadId: null,
          createdAt: f.created_at,
        });
      }

      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(out);
    })();
  }, [userId, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = items.filter((it) => {
    if (filter !== "all" && it.kind !== filter) return false;
    if (projectFilter !== "all" && it.projectId !== projectFilter) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold">Bibliothèque</h2>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-7 text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "generated", "image", "document"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "secondary" : "ghost"} onClick={() => setFilter(k)}>
              {k === "all" ? "Tout" : k === "generated" ? "Images générées" : k === "image" ? "Images jointes" : "Documents"}
            </Button>
          ))}
          <div className="ml-auto">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm">
              <option value="all">Tous les projets</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {filtered.length === 0 && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Rien pour le moment. Les images générées et les fichiers joints à tes conversations apparaîtront ici.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((it) => (
            <a key={it.id} href={it.url} target="_blank" rel="noreferrer"
              className="group flex flex-col overflow-hidden rounded-lg border bg-card transition hover:shadow-md">
              <div className="aspect-square w-full bg-muted">
                {it.kind !== "document" && it.url
                  ? <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>}
              </div>
              <div className="space-y-0.5 p-2 text-xs">
                <div className="truncate font-medium">{it.name}</div>
                <div className="truncate text-muted-foreground">
                  {it.projectName ?? "—"} · {new Date(it.createdAt).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
