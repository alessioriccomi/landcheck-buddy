import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnalisiVincolistica, Particella } from "@/types/vincoli";
import { toast } from "@/hooks/use-toast";

export interface SavedAnalysis {
  id: string;
  name: string;
  description: string | null;
  particelle: Particella[];
  results: AnalisiVincolistica;
  created_at: string;
  updated_at: string;
}

export function useSavedAnalyses(userId?: string) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!userId) { setAnalyses([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setAnalyses((data ?? []).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        particelle: d.particelle as unknown as Particella[],
        results: d.results as unknown as AnalisiVincolistica,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })));
    } catch (err: any) {
      console.error("Fetch analyses error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const saveAnalysis = useCallback(async (
    name: string,
    particelle: Particella[],
    results: AnalisiVincolistica,
    description?: string,
  ) => {
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase.from("saved_analyses").insert({
      user_id: userId,
      name,
      description: description ?? null,
      particelle: particelle as any,
      results: results as any,
    });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Analisi salvata", description: `"${name}" salvata con successo` });
    await fetchAnalyses();
    return { error: null };
  }, [userId, fetchAnalyses]);

  const deleteAnalysis = useCallback(async (id: string) => {
    const { error } = await supabase.from("saved_analyses").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Analisi eliminata" });
    setAnalyses(prev => prev.filter(a => a.id !== id));
  }, []);

  return { analyses, loading, saveAnalysis, deleteAnalysis, refetch: fetchAnalyses };
}
