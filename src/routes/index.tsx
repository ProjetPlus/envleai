import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithEnvle } from "@/lib/chat.functions";
import { streamImage } from "@/lib/streamImage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E'nvlé IA — L'intelligence artificielle africaine" },
      {
        name: "description",
        content:
          "E'nvlé IA : chat intelligent, génération d'images réalistes et création de contenu, 100% pensé pour l'Afrique.",
      },
      { property: "og:title", content: "E'nvlé IA" },
      {
        property: "og:description",
        content: "L'IA africaine pour discuter, créer et générer des images en haute définition.",
      },
    ],
  }),
  component: Index,
});

type Msg = { role: "user" | "assistant"; content: string };

function Index() {
  const [tab, setTab] = useState<"chat" | "image">("chat");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{ background: "var(--gradient-glow)" }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:py-10">
        <Header />
        <Tabs tab={tab} setTab={setTab} />
        <main className="mt-6 flex-1">
          {tab === "chat" ? <ChatPanel /> : <ImagePanel />}
        </main>
        <footer className="mt-10 text-center text-xs text-muted-foreground">
          E'nvlé IA · Fierté africaine · Propulsé par l'IA de nouvelle génération
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black shadow-lg"
        style={{ background: "var(--gradient-hero)", color: "var(--primary-foreground)" }}
      >
        E
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          E&apos;nvlé <span className="text-primary">IA</span>
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          L&apos;intelligence artificielle africaine, moderne et libre
        </p>
      </div>
    </header>
  );
}

function Tabs({
  tab,
  setTab,
}: {
  tab: "chat" | "image";
  setTab: (t: "chat" | "image") => void;
}) {
  const items: { id: "chat" | "image"; label: string; icon: string }[] = [
    { id: "chat", label: "Discussion", icon: "💬" },
    { id: "image", label: "Image", icon: "🎨" },
  ];
  return (
    <nav className="mt-6 inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setTab(it.id)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            tab === it.id
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="mr-1.5">{it.icon}</span>
          {it.label}
        </button>
      ))}
    </nav>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Akwaba ! Je suis E'nvlé IA. Demande-moi un texte, du code, une analyse ou une idée — je suis là pour t'aider.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(chatWithEnvle);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: `⚠️ ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Écris ton message à E'nvlé IA…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagePanel() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImage(null);
    setIsFinal(false);
    setError(null);
    try {
      await streamImage("/api/generate-image", prompt, (url, final) => {
        setImage(url);
        if (final) setIsFinal(true);
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Portrait d'une jeune femme ivoirienne en wax moderne, lumière dorée du couchant",
    "Marché animé de Dakar au crépuscule, style photo réaliste",
    "Skyline futuriste de Lagos avec gratte-ciels en verre et lumières néon",
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-6">
      <label className="text-sm font-medium">Décris l&apos;image à générer</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Ex : marché coloré à Bamako au lever du soleil, ultra réaliste, FHD"
        className="mt-2 w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setPrompt(s)}
            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {s.slice(0, 38)}…
          </button>
        ))}
      </div>
      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold shadow-lg transition hover:opacity-90 disabled:opacity-40"
        style={{ background: "var(--gradient-hero)", color: "var(--primary-foreground)" }}
      >
        {loading ? "Génération en cours…" : "🎨 Générer l'image"}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive-foreground">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-6 aspect-square w-full overflow-hidden rounded-2xl border border-border bg-input">
        {image ? (
          <img
            src={image}
            alt="Image générée par E'nvlé IA"
            className="h-full w-full object-cover transition-[filter] duration-500"
            style={{ filter: isFinal ? "blur(0)" : "blur(16px)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {loading ? "✨ E'nvlé IA dessine pour toi…" : "Ton image apparaîtra ici"}
          </div>
        )}
      </div>

      {image && isFinal && (
        <a
          href={image}
          download="envle-ia.png"
          className="mt-3 block rounded-xl border border-border bg-secondary py-2 text-center text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          ⬇️ Télécharger
        </a>
      )}
    </div>
  );
}
