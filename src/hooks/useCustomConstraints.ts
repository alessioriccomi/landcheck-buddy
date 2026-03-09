import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomConstraint {
  id: string;
  name: string;
  url: string;
  color: string;
  description: string | null;
  active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useCustomConstraints(userId: string | undefined) {
  const [constraints, setConstraints] = useState<CustomConstraint[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's custom constraints
  const fetchConstraints = useCallback(async () => {
    if (!userId) {
      setConstraints([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_constraints")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConstraints(data ?? []);
    } catch (err: any) {
      console.error("Failed to fetch constraints:", err);
      toast({ title: "Errore", description: "Impossibile caricare i vincoli personalizzati", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  // Add a new constraint
  const addConstraint = useCallback(async (data: { name: string; url: string; color: string; description?: string }) => {
    if (!userId) return { error: new Error("Non autenticato") };
    try {
      const { error } = await supabase.from("custom_constraints").insert({
        user_id: userId,
        name: data.name,
        url: data.url,
        color: data.color,
        description: data.description ?? null,
        active: true,
      });
      if (error) throw error;
      toast({ title: "Vincolo aggiunto", description: data.name });
      await fetchConstraints();
      return { error: null };
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      return { error: err };
    }
  }, [userId, fetchConstraints]);

  // Toggle active state
  const toggleConstraint = useCallback(async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("custom_constraints")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
      setConstraints(prev => prev.map(c => c.id === id ? { ...c, active } : c));
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  }, []);

  // Delete a constraint
  const deleteConstraint = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_constraints")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setConstraints(prev => prev.filter(c => c.id !== id));
      toast({ title: "Vincolo eliminato" });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  }, []);

  return {
    constraints,
    loading,
    addConstraint,
    toggleConstraint,
    deleteConstraint,
    refetch: fetchConstraints,
  };
}
