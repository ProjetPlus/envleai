import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ProfileDraft = {
  display_name: string;
  age: string;
  country: string;
  profession: string;
  sector: string;
  goals: string;
};

export function OnboardingDialog({
  open,
  userId,
  initialName,
  onDone,
}: {
  open: boolean;
  userId: string;
  initialName?: string;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>({
    display_name: initialName ?? "",
    age: "",
    country: "",
    profession: "",
    sector: "",
    goals: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.display_name.trim()) {
      toast.error("Indique au moins ton prénom");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: draft.display_name.trim(),
        age: draft.age ? Number(draft.age) : null,
        country: draft.country.trim() || null,
        profession: draft.profession.trim() || null,
        sector: draft.sector.trim() || null,
        goals: draft.goals.trim() || null,
        onboarded: true,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Profil enregistré");
    onDone();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bienvenue sur E'nvlé AI 👋</DialogTitle>
          <DialogDescription>
            Quelques infos pour que l'IA s'adapte à toi. Tu pourras les modifier plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ob-name">Prénom / Nom</Label>
            <Input id="ob-name" value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ob-age">Âge</Label>
              <Input id="ob-age" inputMode="numeric" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ob-country">Pays</Label>
              <Input id="ob-country" placeholder="Côte d'Ivoire" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-prof">Métier / fonction</Label>
            <Input id="ob-prof" placeholder="Étudiant, développeur, entrepreneur…" value={draft.profession} onChange={(e) => setDraft({ ...draft, profession: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-sector">Secteur / domaine</Label>
            <Input id="ob-sector" placeholder="Tech, agriculture, finance…" value={draft.sector} onChange={(e) => setDraft({ ...draft, sector: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-goals">Objectifs / ce que tu veux faire avec E'nvlé AI</Label>
            <Textarea id="ob-goals" rows={3} value={draft.goals} onChange={(e) => setDraft({ ...draft, goals: e.target.value })} />
          </div>
        </div>
        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? "Enregistrement…" : "Continuer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}