import { createFileRoute } from "@tanstack/react-router";

type Body = {
  prompt: string;
  referenceImages?: string[]; // data URLs
  aspect?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
};

const SIZE_MAP: Record<NonNullable<Body["aspect"]>, string> = {
  "1:1": "1024x1024",
  "3:4": "896x1152",
  "4:3": "1152x896",
  "16:9": "1344x768",
  "9:16": "768x1344",
};

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, referenceImages, aspect = "1:1" } = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Clé API manquante", { status: 500 });

        const hasRef = Array.isArray(referenceImages) && referenceImages.length > 0;

        // Use Gemini Nano Banana 2 — much better realism on humans + supports
        // reference image editing. Falls back to OpenAI gpt-image-2 if no reference.
        const usingGemini = true;

        const enrichedPrompt = hasRef
          ? `${prompt}\n\nIMPORTANT : Reproduis fidèlement le sujet, le visage, les traits, la peau, les vêtements et l'identité visuelle de l'image de référence fournie. Garde l'authenticité. Résultat ultra réaliste, FHD, professionnel.`
          : `${prompt}\n\nStyle : photoréaliste, FHD, lumière naturelle, anatomie humaine correcte (visages, mains, yeux), authentique, professionnel.`;

        const body = usingGemini
          ? {
              model: "google/gemini-3.1-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: hasRef
                    ? [
                        { type: "text", text: enrichedPrompt },
                        ...referenceImages!.map((url) => ({
                          type: "image_url",
                          image_url: { url },
                        })),
                      ]
                    : enrichedPrompt,
                },
              ],
              modalities: ["image", "text"],
              stream: true,
            }
          : {
              model: "openai/gpt-image-2",
              prompt: enrichedPrompt,
              quality: "low",
              size: SIZE_MAP[aspect],
              stream: true,
              partial_images: 1,
            };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Erreur génération image", { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});