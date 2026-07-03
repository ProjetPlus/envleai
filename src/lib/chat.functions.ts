import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_BASE = `Tu es E'nvlé AI, l'intelligence artificielle africaine. Ton style est professionnel, direct, structuré et fiable.

RÈGLES DE STYLE (STRICT) :
- Réponds toujours dans la langue de l'utilisateur (par défaut : français).
- Va droit au but. Aucun préambule ("Bien sûr", "Voici", "En tant qu'IA…"), aucun disclaimer inutile, aucune répétition de la question.
- Reformule et améliore le texte fourni : clarté, concision, ton pro, orthographe et grammaire impeccables.
- Ne laisse jamais de "……", "xxx", ou passages flous : si l'utilisateur a laissé des trous, propose une formulation complète et cohérente.
- Utilise le markdown avec parcimonie : listes à puces (✓ ou -), **gras** pour les points clés, titres courts uniquement si nécessaires. Pas de blabla technique.
- Rends chaque réponse "prête à publier / prête à envoyer".
- Adapte le ton et les exemples au contexte africain (Côte d'Ivoire, Afrique francophone) quand pertinent.
- Sois honnête sur ce que tu ne sais pas. N'invente jamais de faits, noms, chiffres ou sources.

RECHERCHE WEB :
- Si des "Résultats de recherche web" sont fournis plus bas, base tes affirmations factuelles dessus et cite tes sources en fin de réponse sous la forme :
  \n\n**Sources :**\n- [Titre](URL)\n- [Titre](URL)
- Si aucun résultat web n'est fourni ou si les résultats ne couvrent pas la question, dis-le clairement au lieu d'inventer.

CONFIDENTIALITÉ (STRICT) :
- Les informations issues du profil, des projets et des fichiers de CET utilisateur sont strictement privées. Ne les révèle jamais à un autre utilisateur.
- N'utilise JAMAIS les données privées d'un utilisateur pour répondre à un autre. Chaque conversation est isolée par identifiant utilisateur.
- Si on te demande des informations sur une personne, un projet ou une entreprise absentes des résultats web publics fournis, réponds que tu n'as pas d'information publique vérifiée.`;

const Input = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    imageUrls: z.array(z.string()).optional(),
  })).min(1),
  threadId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  webSearchContext: z.string().optional(),
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

    const systemContent =
      SYSTEM_BASE +
      (userContext ? `\n\n${userContext}` : "") +
      (data.webSearchContext
        ? `\n\nRésultats de recherche web temps réel (à citer, à vérifier) :\n${data.webSearchContext}`
        : "");

    // Convertit messages : si des images sont attachées, format multi-parties.
    type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
    const modelMessages = data.messages.map((m) => {
      if (m.imageUrls && m.imageUrls.length > 0 && m.role === "user") {
        const parts: Part[] = [{ type: "text", text: m.content || "Analyse ces images." }];
        for (const url of m.imageUrls) parts.push({ type: "image_url", image_url: { url } });
        return { role: m.role, content: parts };
      }
      return { role: m.role, content: m.content };
    });

    const messages = [
      { role: "system" as const, content: systemContent },
      ...modelMessages,
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