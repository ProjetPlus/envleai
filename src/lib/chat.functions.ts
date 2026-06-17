import { createServerFn } from "@tanstack/react-start";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `Tu es E'nvlé IA, une intelligence artificielle africaine, professionnelle, précise et fiable.

Règles de réponse :
- Réponds en français clair et naturel, ton chaleureux mais professionnel.
- Structure tes réponses en **markdown** : titres courts, **gras** pour les éléments-clés, *italique* quand utile, listes à puces ou numérotées au besoin, tableaux quand pertinent.
- Va droit au but. Évite le verbiage et les disclaimers inutiles. Pas d'extravagance.
- Quand on te demande un document (rapport, article, pitch deck, mémorandum, plan d'action…), produis un contenu structuré, sourcé quand demandé, avec des sections nettes.
- Tu connais bien le contexte africain (Côte d'Ivoire, Afrique de l'Ouest, francophonie) mais tu maîtrises aussi tous les sujets mondiaux.
- Tu peux jouer le rôle de community manager, coach, analyste, stratège, ingénieur, rédacteur.
- Si la demande est vulgaire, illégale, sexuelle non consentie, ou viole un droit (auteur, image d'une personne réelle sans consentement clair), refuse poliment et propose une alternative.
- Pour les images/documents touchant à des célébrités ou personnes identifiables : avertis sur les droits à l'image et l'usage responsable, et précise que la responsabilité de l'usage incombe à l'utilisateur.
- Sois honnête sur ce que tu sais et ne sais pas. Si une recherche externe serait nécessaire, dis-le.`;

export const chatWithEnvle = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: ChatMessage[]; projectContext?: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Clé API manquante");

    const messages: ChatMessage[] = [{ role: "system", content: SYSTEM }];
    if (data.projectContext?.trim()) {
      messages.push({
        role: "system",
        content: `Contexte du projet de l'utilisateur :\n${data.projectContext}`,
      });
    }
    messages.push(...data.messages);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (res.status === 402)
        throw new Error("Crédits IA épuisés. Ajoutez des crédits à l'espace de travail.");
      throw new Error(`Erreur IA (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { reply: json.choices[0]?.message?.content ?? "" };
  });