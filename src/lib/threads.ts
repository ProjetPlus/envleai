import type { Msg } from "./types";

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

const KEY = "envle.threads.v1";

function read(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Thread[];
  } catch {
    return [];
  }
}

function write(threads: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(threads));
  window.dispatchEvent(new Event("envle:threads-changed"));
}

export function listThreads(): Thread[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getThread(id: string): Thread | undefined {
  return read().find((t) => t.id === id);
}

export function createThread(): Thread {
  const now = Date.now();
  const t: Thread = {
    id: crypto.randomUUID(),
    title: "Nouvelle discussion",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  write([t, ...read()]);
  return t;
}

export function saveThread(t: Thread) {
  const all = read();
  const idx = all.findIndex((x) => x.id === t.id);
  const updated = { ...t, updatedAt: Date.now() };
  if (idx === -1) write([updated, ...all]);
  else {
    all[idx] = updated;
    write(all);
  }
}

export function deleteThread(id: string) {
  write(read().filter((t) => t.id !== id));
}

export function renameThread(id: string, title: string) {
  const all = read();
  const t = all.find((x) => x.id === id);
  if (!t) return;
  t.title = title || t.title;
  t.updatedAt = Date.now();
  write(all);
}

export function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Nouvelle discussion";
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean;
}