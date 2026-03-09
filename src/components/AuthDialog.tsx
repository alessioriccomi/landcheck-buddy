import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "signin" | "signup";

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Benvenuto!", description: "Accesso effettuato con successo" });
        onOpenChange(false);
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({
          title: "Registrazione completata",
          description: "Controlla la tua email per confermare l'account",
        });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Operazione fallita",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {mode === "signin" ? "Accedi" : "Crea account"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "signin"
              ? "Accedi per salvare vincoli personalizzati e analisi"
              : "Registrati per iniziare a usare le funzionalità avanzate"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-9 text-sm"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin mr-2" />}
            {mode === "signin" ? "Accedi" : "Registrati"}
          </Button>
        </form>

        <div className="text-center mt-2">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-primary hover:underline"
          >
            {mode === "signin"
              ? "Non hai un account? Registrati"
              : "Hai già un account? Accedi"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
