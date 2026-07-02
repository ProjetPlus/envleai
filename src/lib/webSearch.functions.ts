import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(8).optional(),
});

type FirecrawlSearchResult = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
};

/**
 * Recherche web temps réel via Firecrawl.
 * Confidentialité : n'expose jamais de données privées ; ne cherche que sur le web public.
 */
export const webSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key =
      process.env.FIRECRAWL_API_KEY ||
      process.env.LOVABLE_CONNECTOR_FIRECRAWL_API_KEY;
    if (!key) {
      return {
        available: false,
        context: "",
        sources: [] as { url: string; title: string }[],
        message:
          "Recherche web indisponible : ajoute la clé FIRECRAWL_API_KEY dans les paramètres pour activer les sources vérifiées.",
      };
    }

    try {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: data.query,
          limit: data.limit ?? 5,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });
      if (!res.ok) {
        return {
          available: false,
          context: "",
          sources: [],
          message: `Recherche web échouée (${res.status})`,
        };
      }
      const json = (await res.json()) as {
        data?: { web?: FirecrawlSearchResult[] } | FirecrawlSearchResult[];
      };
      const raw = Array.isArray(json.data)
        ? json.data
        : json.data?.web ?? [];
      const results = raw.slice(0, data.limit ?? 5);

      const context = results
        .map((r, i) => {
          const body = (r.markdown || r.description || "").slice(0, 1200);
          return `[Source ${i + 1}] ${r.title ?? ""}\n${r.url ?? ""}\n${body}`;
        })
        .join("\n\n---\n\n");

      return {
        available: true,
        context,
        sources: results.map((r) => ({
          url: r.url ?? "",
          title: r.title ?? r.url ?? "",
        })),
        message: `${results.length} source(s) trouvée(s)`,
      };
    } catch (e) {
      return {
        available: false,
        context: "",
        sources: [],
        message: (e as Error).message,
      };
    }
  });