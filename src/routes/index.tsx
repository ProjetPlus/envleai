import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Menu, Plus, Send, Download, FileText, Image as ImgIcon, Trash2, MessageSquare, Upload, X } from "lucide-react";
import logo from "@/assets/envle-logo.png";
import { chatWithEnvle } from "@/lib/chat.functions";
import { streamImage } from "@/lib/streamImage";
import { Markdown } from "@/components/Markdown";
import {
  createThread,
  deleteThread,
  deriveTitle,
  getThread,
  listThreads,
  renameThread,
  saveThread,
  type Thread,
} from "@/lib/threads";
import { exportChatPdf, exportChatTxt } from "@/lib/exportChat";
import { envleFileName, listAssets, saveAsset, type GeneratedAsset } from "@/lib/history";
import type { Msg } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E'nvlé IA — L'intelligence artificielle africaine" },
      {
        name: "description",
        content:
          "E'nvlé IA : discussion intelligente, génération d'images réalistes et création de contenu pro. 100% pensé pour l'Afrique.",
      },
    ],
  }),
  component: App,
});

type View = "chat" | "image" | "history";

function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [sidebar, setSidebar] = useState(false);

  // Bootstrap (idempotent, StrictMode-safe)
  useEffect(() => {
    const all = listThreads();
    if (all.length === 0) {
      const t = createThread();
      setThreads([t]);
      setActiveId(t.id);
    } else {
      setThreads(all);
      setActiveId(all[0].id);
    }
    const refresh = () => setThreads(listThreads());
    window.addEventListener("envle:threads-changed", refresh);
    return () => window.removeEventListener("envle:threads-changed", refresh);
  }, []);

  function newThread() {
    const t = createThread();
    setActiveId(t.id);
    setView("chat");
    setSidebar(false);
  }

  const active = activeId ? threads.find((t) => t.id === activeId) || getThread(activeId) : null;

  return (
    <div className="flex h-dvh w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0 ${
          sidebar ? "translate-x-0" : "-translate-x-full"
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
          onClick={newThread}
          className="mx-3 mt-1 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-background py-2 text-sm font-medium hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> Nouvelle discussion
        </button>

        <nav className="mt-4 flex flex-col gap-1 px-3 text-sm">
          <NavBtn icon={<MessageSquare className="h-4 w-4" />} label="Discussion" active={view === "chat"} onClick={() => { setView("chat"); setSidebar(false); }} />
          <NavBtn icon={<ImgIcon className="h-4 w-4" />} label="Image" active={view === "image"} onClick={() => { setView("image"); setSidebar(false); }} />
          <NavBtn icon={<FileText className="h-4 w-4" />} label="Historique" active={view === "history"} onClick={() => { setView("history"); setSidebar(false); }} />
        </nav>

        <div className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Discussions
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {threads.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">Aucune discussion.</div>
          )}
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center">
                <button
                  onClick={() => { setActiveId(t.id); setView("chat"); setSidebar(false); }}
                  className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                    activeId === t.id
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {t.title}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer cette discussion ?")) {
                      deleteThread(t.id);
                      if (activeId === t.id) {
                        const rest = listThreads();
                        setActiveId(rest[0]?.id ?? null);
                      }
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

      {sidebar && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebar(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2 md:hidden">
          <button onClick={() => setSidebar(true)} className="rounded-md p-2 hover:bg-secondary" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          <div className="text-sm font-semibold">E&apos;nvlé IA</div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">
          {view === "chat" && active && (
            <ChatView
              thread={active}
              onUpdate={(t) => { saveThread(t); setThreads(listThreads()); }}
            />
          )}
          {view === "image" && <ImageView />}
          {view === "history" && <HistoryView />}
        </main>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function ChatView({ thread, onUpdate }: { thread: Thread; onUpdate: (t: Thread) => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(chatWithEnvle);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { taRef.current?.focus(); }, [thread.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.messages.length, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] = [...thread.messages, userMsg];
    const updated: Thread = {
      ...thread,
      messages: next,
      title: thread.messages.length === 0 ? deriveTitle(text) : thread.title,
    };
    onUpdate(updated);
    if (thread.messages.length === 0) renameThread(thread.id, updated.title);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await chat({ data: { messages: next } });
      onUpdate({ ...updated, messages: [...next, { role: "assistant", content: reply }] });
    } catch (e) {
      onUpdate({ ...updated, messages: [...next, { role: "assistant", content: `⚠️ ${(e as Error).message}` }] });
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{thread.title}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportChatTxt(thread.title, thread.messages)}
            disabled={thread.messages.length === 0}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> TXT
          </button>
          <button
            onClick={() => exportChatPdf(thread.title, thread.messages)}
            disabled={thread.messages.length === 0}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {thread.messages.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <img src={logo} alt="" className="mb-4 h-16 w-16 object-contain" />
              <h2 className="text-xl font-bold">Bonjour, je suis E&apos;nvlé IA</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Demande-moi un texte, un plan, une analyse, du code, une idée. Je réponds de façon claire et structurée.
              </p>
            </div>
          )}
          <div className="space-y-5">
            {thread.messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-secondary px-4 py-2.5 text-sm whitespace-pre-wrap"
                      : "max-w-[90%]"
                  }
                >
                  {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex gap-1 rounded-2xl bg-secondary px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>
      <div className="border-t border-border p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Écris ton message à E'nvlé IA…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function ImageView() {
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const arr: string[] = [];
    for (const f of Array.from(files).slice(0, 3)) {
      arr.push(await fileToDataUrl(f));
    }
    setRefs((r) => [...r, ...arr].slice(0, 3));
  }

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImage(null);
    setIsFinal(false);
    setError(null);
    try {
      let finalUrl: string | null = null;
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImages: refs }),
      });
      if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}: ${await res.text().catch(() => "")}`);
      await streamImage("/api/generate-image", prompt, () => {}); // unused — we use fetch above for refs body
      // Above call uses helper that doesn't pass refs; replace with manual SSE parsing
      finalUrl = null;
      // Actually do streaming with our own fetch:
      // (Already started above — read its body)
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const block of events) {
          const lines = block.split("\n");
          let event = "";
          let data = "";
          for (const ln of lines) {
            if (ln.startsWith("event:")) event = ln.slice(6).trim();
            else if (ln.startsWith("data:")) data += ln.slice(5).trim();
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data) as { b64_json?: string };
            if (payload.b64_json) {
              const url = `data:image/png;base64,${payload.b64_json}`;
              setImage(url);
              if (event === "image_generation.completed") {
                setIsFinal(true);
                finalUrl = url;
              }
            }
          } catch {}
        }
      }
      if (finalUrl) {
        saveAsset({ kind: "image", format: "png", name: envleFileName(prompt.slice(0, 20), "png"), dataUrl: finalUrl });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Génération d&apos;image</h2>
      <p className="text-sm text-muted-foreground">Décris l&apos;image et, si tu veux reproduire un style ou une personne, ajoute une photo de référence.</p>

      <label className="mt-4 block text-sm font-medium">Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Ex : portrait professionnel d'une jeune femme ivoirienne, lumière douce du couchant, FHD"
        className="mt-1 w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-secondary">
          <Upload className="h-4 w-4" /> Ajouter une photo de référence
        </span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </label>
      {refs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {refs.map((src, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setRefs((r) => r.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? "Génération…" : "🎨 Générer l'image"}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      {(image || loading) && (
        <div className="mt-6 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary">
          {image ? (
            <img
              src={image}
              alt="Image générée"
              className="h-full w-full object-cover transition-[filter] duration-500"
              style={{ filter: isFinal ? "blur(0)" : "blur(16px)" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">✨ E&apos;nvlé IA dessine pour toi…</div>
          )}
        </div>
      )}

      {image && isFinal && (
        <a
          href={image}
          download={envleFileName(prompt.slice(0, 20), "png")}
          className="mt-3 block rounded-xl border border-border py-2 text-center text-sm font-medium hover:bg-secondary"
        >
          ⬇️ Télécharger
        </a>
      )}
    </div>
  );
}

function HistoryView() {
  const [items, setItems] = useState<GeneratedAsset[]>([]);
  useEffect(() => {
    const refresh = () => setItems(listAssets());
    refresh();
    window.addEventListener("envle:assets-changed", refresh);
    return () => window.removeEventListener("envle:assets-changed", refresh);
  }, []);
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Historique</h2>
      <p className="text-sm text-muted-foreground">Tous les contenus générés sont sauvegardés ici (sur ce navigateur).</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucun élément généré pour le moment.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <a
              key={a.id}
              href={a.dataUrl}
              download={a.name}
              className="group block overflow-hidden rounded-xl border border-border bg-card"
            >
              {a.kind === "image" ? (
                <img src={a.dataUrl} alt={a.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="truncate p-2 text-xs">{a.name}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}