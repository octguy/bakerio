"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Croissant } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push("/");
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Croissant className="mx-auto mb-2 text-brand-700" size={32} aria-hidden="true" />
          <CardTitle className="text-xl">Bakerio Admin</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in with your admin account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive bg-red-50 p-2 rounded">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
