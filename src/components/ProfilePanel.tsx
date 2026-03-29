import { useState } from "react";
import { User, Building, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/hooks/useProfile";

interface ProfilePanelProps {
  profile: UserProfile | null;
  email?: string;
  loading: boolean;
  onUpdate: (updates: { display_name?: string; company?: string }) => Promise<void>;
}

export function ProfilePanel({ profile, email, loading, onUpdate }: ProfilePanelProps) {
  const [name, setName] = useState(profile?.display_name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ display_name: name.trim() || undefined, company: company.trim() || undefined });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {profile?.display_name || email || "Utente"}
          </p>
          {email && <p className="text-[10px] text-muted-foreground truncate">{email}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Nome</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Il tuo nome..."
            className="h-7 text-[10px]"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Azienda</label>
          <div className="flex items-center gap-1">
            <Building size={12} className="text-muted-foreground flex-shrink-0" />
            <Input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Nome azienda..."
              className="h-7 text-[10px]"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-8 text-[10px] gap-1"
        size="sm"
      >
        {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
        Salva profilo
      </Button>
    </div>
  );
}
