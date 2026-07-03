import { createFileRoute } from "@tanstack/react-router";

type Body = {
  prompt: string;
  referenceImages?: string[];
};

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, referenceImages } = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response(JSON.stringify({ error: "Clé IA manquante" }), { status: 500 });

        const hasRef = Array.isArray(referenceImages) && referenceImages.length > 0;
        const enriched = hasRef
          ? `Tâche d'édition d'image basée sur la ou les image(s) de référence fournie(s).\n\nInstruction utilisateur : ${prompt}\n\nCONSIGNES STRICTES :\n- Conserve fidèlement l'identité visuelle, le visage, les traits, la peau, les cheveux, les vêtements et la pose des sujets présents sur la référence.\n- Applique UNIQUEMENT la modification demandée (ajout, suppression, changement d'arrière-plan, cadrage, format réseau social, etc.).\n- Ne remplace pas les personnes ou objets non concernés.\n- Photoréaliste, haute définition, éclairage cohérent avec la scène d'origine, anatomie correcte, mains correctes.`
          : `${prompt}\n\nStyle: photoréaliste, haute définition, éclairage naturel, composition professionnelle, anatomie et mains correctes.`;

        const content: unknown[] = [{ type: "text", text: enriched }];
        if (hasRef) {
          for (const url of referenceImages!) content.push({ type: "image_url", image_url: { url } });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429)
            return Response.json({ error: "Trop de requêtes. Réessayez bientôt." }, { status: 429 });
          if (upstream.status === 402)
            return Response.json({ error: "Crédits IA épuisés." }, { status: 402 });
          return Response.json({ error: text.slice(0, 300) || "Erreur génération image" }, { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
        };
        const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!url) return Response.json({ error: "Aucune image générée" }, { status: 502 });
        return Response.json({ imageUrl: url });
      },
    },
  },
});