import type { GeneratedAsset } from "./types";

const KEY = "envle.assets.v1";

function read(): GeneratedAsset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as GeneratedAsset[];
  } catch {
    return [];
  }
}

function write(items: GeneratedAsset[]) {
  if (typeof window === "undefined") return;
  // cap at 50 items to keep localStorage from exploding
  const capped = items.slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(capped));
  window.dispatchEvent(new Event("envle:assets-changed"));
}

export function listAssets(): GeneratedAsset[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveAsset(a: Omit<GeneratedAsset, "id" | "createdAt">) {
  const item: GeneratedAsset = {
    ...a,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  write([item, ...read()]);
  return item;
}

export function deleteAsset(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function envleFileName(base: string, ext: string) {
  const safe = base.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "fichier";
  const date = new Date().toISOString().slice(0, 10);
  return `Envle-${safe}-${date}.${ext}`;
}