import { createServerFn } from "@tanstack/react-start";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const chatWithEnvle = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Clé API manquante");

    const systemPrompt: ChatMessage = {
      role: "system",
      content:
        "Tu es E'nvlé IA, une intelligence artificielle 100% africaine, moderne et fière. Tu réponds en français clair, chaleureux et professionnel, avec une touche africaine quand c'est pertinent. Tu aides pour la rédaction, le code, l'analyse, la création et la résolution de problèmes complexes.",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [systemPrompt, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de requêtes. Réessayez dans un instant.");
      if (res.status === 402)
        throw new Error("Crédits IA épuisés. Ajoutez des crédits à l'espace de travail.");
      throw new Error(`Erreur IA: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return { reply: json.choices[0]?.message?.content ?? "" };
  });