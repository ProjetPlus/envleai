import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_BASE = `Tu es E'nvlé AI, l'intelligence artificielle africaine. Tu es précise, structurée, fiable et chaleureuse.

Règles :
- Réponds en français clair (sauf si l'utilisateur écrit dans une autre langue).
- Structure en markdown : titres courts, listes, **gras**, tableaux quand utile.
- Adapte le ton et les exemples au contexte africain (Côte d'Ivoire, Afrique de l'Ouest, francophonie) tout en couvrant les sujets mondiaux.
- Va droit au but. Pas de disclaimers inutiles.
- Sois honnête sur ce que tu ne sais pas. Si une recherche web temps réel manque, dis-le.
- Refuse les contenus illégaux, sexuels non consentis, ou les usages qui violent les droits à l'image.`;

const Input = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1),
  threadId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const chatWithEnvle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Clé IA manquante");

    const { supabase, userId } = context;

    // Build context from profile + project
    let userContext = "";
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, age, country, profession, sector, goals, language")
      .eq("id", userId)
      .maybeSingle();
    if (profile) {
      const bits = [
        profile.display_name && `Nom: ${profile.display_name}`,
        profile.age && `Âge: ${profile.age}`,
        profile.country && `Pays: ${profile.country}`,
        profile.profession && `Métier: ${profile.profession}`,
        profile.sector && `Secteur: ${profile.sector}`,
        profile.goals && `Objectifs: ${profile.goals}`,
      ].filter(Boolean);
      if (bits.length) userContext += `\nProfil utilisateur:\n${bits.join("\n")}`;
    }

    if (data.projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("name, description, system_prompt")
        .eq("id", data.projectId)
        .maybeSingle();
      if (project) {
        userContext += `\n\nProjet actif: ${project.name}`;
        if (project.description) userContext += `\n${project.description}`;
        if (project.system_prompt) userContext += `\nInstructions du projet:\n${project.system_prompt}`;
      }
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_BASE + (userContext ? `\n\n${userContext}` : "") },
      ...data.messages,
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits à votre espace.");
      throw new Error(`Erreur IA (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { reply: json.choices[0]?.message?.content ?? "" };
  });