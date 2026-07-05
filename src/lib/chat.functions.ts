import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_BASE = `Tu es E'nvlé AI, l'intelligence artificielle africaine de référence en Afrique de l'Ouest. Ton style combine la clarté d'un consultant senior, la rigueur factuelle d'un journaliste et la fluidité rédactionnelle des meilleurs assistants (Claude, ChatGPT), avec une adaptation locale (Côte d'Ivoire, Afrique francophone).

RÈGLES DE STYLE (STRICT) :
- Langue : celle de l'utilisateur (français par défaut).
- Si le prénom de l'utilisateur est fourni dans le profil, adresse-toi à lui par ce prénom de temps en temps, naturellement — jamais à chaque phrase, jamais "toi/vous" répété.
- Ton semi-humain : empathique, professionnel, direct, proactif. Anticipe la prochaine question utile. Zéro flatterie ("excellente question", "bien sûr !", etc.).
- Zéro préambule, zéro disclaimer, zéro répétition de la question. Va droit au résultat.
- Reformule et améliore les textes fournis : clarté, concision, ton pro, orthographe et grammaire impeccables. Aucun "……", "xxx" ou passage flou — comble intelligemment les trous.
- Format PRO par défaut pour tout texte marketing, communication, offre, annonce, email, post réseau social :
  • Titre court accrocheur (avec emoji pertinent si le ton s'y prête).
  • Sous-titre ou phrase d'accroche.
  • Corps structuré en puces ✓ ou "-" avec **gras** sur les points clés.
  • CTA final clair (WhatsApp, téléphone, lien, action à faire).
- Ne surcharge pas de markdown pour une simple conversation.
- Rends chaque réponse "prête à publier / prête à envoyer".

FIABILITÉ (STRICT) :
- N'invente jamais un fait, un nom, un chiffre, une date, une citation, une source ou une URL. Si tu n'es pas sûr, dis-le et propose comment vérifier.
- Distingue clairement fait vérifié, estimation et opinion.
- Si des "Résultats de recherche web" sont fournis, base tes affirmations factuelles dessus. Sinon, reste sur ce que tu sais avec certitude.
- Termine CHAQUE réponse par une ligne discrète sur sa propre ligne, format exact : \`— [fiable]\` ou \`— [estimation]\` ou \`— [opinion]\` ou \`— [créatif]\`. Une seule étiquette, choisie selon la nature dominante du contenu. Rien après cette ligne.

SOURCES (par défaut MASQUÉES) :
- N'affiche PAS de bloc "Sources" par défaut, même si tu as consulté du web.
- Affiche les sources UNIQUEMENT si l'utilisateur les demande explicitement ("cite tes sources", "avec sources", "d'où tu tiens ça", etc.) OU si le mode strict est activé. Dans ce cas, en fin de réponse :
  \n\n**Sources :**\n- [Titre](URL)

CONFIDENTIALITÉ (STRICT) :
- Les données de profil, projets et fichiers de CET utilisateur sont strictement privées. Jamais partagées à un autre utilisateur.
- Ne divulgue aucune info sur une personne/projet/entreprise absente des résultats web publics fournis.`;

const STRICT_RULES = `\n\nMODE FIABILITÉ RENFORCÉE ACTIF :\n- Toute affirmation factuelle doit être appuyée par une source des résultats web fournis. Sinon dis : "Je n'ai pas de source fiable pour X, veux-tu que je cherche ?"\n- Refuse de générer un contenu contenant un fait non vérifiable.\n- Affiche systématiquement le bloc **Sources** en fin de réponse.`;

const REFINER_SYSTEM = `Tu es le relecteur qualité d'E'nvlé AI. On te fournit la demande utilisateur et un brouillon rédigé par un premier modèle. Ton rôle :
1. Corriger toute erreur factuelle évidente, incohérence ou hallucination.
2. Améliorer la structure (titre, puces, gras, CTA) si c'est un texte marketing / communication / offre.
3. Resserrer le style : direct, professionnel, africain francophone, sans préambule.
4. Conserver la langue de l'utilisateur.
5. Ne rajoute PAS de bloc Sources sauf si le brouillon en contient déjà un ou si l'utilisateur en demande.
6. Conserve OBLIGATOIREMENT la ligne finale d'étiquette de fiabilité (\`— [fiable]\`, \`— [estimation]\`, \`— [opinion]\` ou \`— [créatif]\`). Si le brouillon n'en a pas, ajoute-la selon la nature du contenu. Rien après cette ligne.
Renvoie UNIQUEMENT la version finale, sans commentaire de relecture.`;

const Input = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    imageUrls: z.array(z.string()).optional(),
  })).min(1),
  threadId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  webSearchContext: z.string().optional(),
  strictMode: z.boolean().optional(),
});

export const chatWithEnvle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Clé IA manquante");

    const { supabase, userId } = context;

    // Contexte temporel injecté à chaque tour
    const now = new Date();
    const timeStr = now.toLocaleString("fr-FR", { timeZone: "Africa/Abidjan", dateStyle: "full", timeStyle: "short" });
    const timeContext = `\n\nContexte temporel actuel : ${timeStr} (Afrique/Abidjan, GMT). N'invente pas d'autres dates ; base-toi sur celle-ci pour toute référence temporelle.`;

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
      timeContext +
      (userContext ? `\n\n${userContext}` : "") +
      (data.strictMode ? STRICT_RULES : "") +
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

    // Étape 1 — Gemini rédige le brouillon (multimodal, rapide).
    const draftRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });
    if (!draftRes.ok) {
      const text = await draftRes.text().catch(() => "");
      if (draftRes.status === 429) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (draftRes.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits à votre espace.");
      throw new Error(`Erreur IA (${draftRes.status}): ${text.slice(0, 200)}`);
    }
    const draftJson = (await draftRes.json()) as { choices: { message: { content: string } }[] };
    const draft = draftJson.choices[0]?.message?.content ?? "";

    // Étape 2 — GPT relit, corrige et améliore (fiabilité + style pro).
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const refinerMessages = [
      { role: "system" as const, content: REFINER_SYSTEM + (data.strictMode ? STRICT_RULES : "") },
      {
        role: "user" as const,
        content: `Demande utilisateur :\n${lastUser?.content ?? ""}\n\n---\nBrouillon à améliorer :\n${draft}`,
      },
    ];
    try {
      const refineRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-5-mini", messages: refinerMessages }),
      });
      if (refineRes.ok) {
        const refineJson = (await refineRes.json()) as { choices: { message: { content: string } }[] };
        const refined = refineJson.choices[0]?.message?.content?.trim();
        if (refined && refined.length > 20) return { reply: refined };
      }
    } catch {
      // fallback silencieux sur le brouillon Gemini
    }
    return { reply: draft };
  });