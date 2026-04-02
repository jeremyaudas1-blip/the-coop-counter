import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  // Apply dark mode
  document.documentElement.classList.add("dark");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let err: string | null;
    if (mode === "login") {
      err = await login(email, password);
    } else {
      if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
      if (!familyName.trim()) { setError("Family coop name is required"); setLoading(false); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
      err = await signup(name.trim(), email, password, familyName.trim(), marketingConsent);
    }

    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <span className="text-5xl block">🐔</span>
          <h1 className="text-2xl font-bold tracking-tight">The Coop Counter</h1>
          <p className="text-sm text-muted-foreground">Track your eggs. Celebrate your hens. Compete with the family.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Tab toggle */}
            <div className="flex bg-muted rounded-lg p-1 mb-6">
              <button onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-login">
                Log In
              </button>
              <button onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-signup">
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">👤 Your name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jeremy" data-testid="input-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">🐔 Name your family coop</label>
                    <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Audas Coop" data-testid="input-family-name" />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">📧 Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" data-testid="input-email" />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">🔒 Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} data-testid="input-password" />
              </div>

              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 rounded" data-testid="checkbox-marketing" />
                  <span>Send me egg collection tips and coop updates (you can unsubscribe anytime)</span>
                </label>
              )}

              {error && <p className="text-sm text-destructive" data-testid="auth-error">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-auth-submit">
                {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {mode === "login" ? (
                <>Don't have an account? <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-medium">Sign up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-medium">Log in</button></>
              )}
            </p>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground">
          <p className="mb-1">🐔🥚🐔🥚🐔</p>
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Created with Perplexity Computer</a>
        </footer>
      </div>
    </div>
  );
}
