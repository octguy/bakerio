"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "./schema";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push("/");
  };

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-heading text-2xl font-bold text-center mb-6">Welcome Back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="sr-only">Email</label>
          <input
            id="login-email"
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="w-full border border-crust rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-golden"
          />
          {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
        </div>
        <div>
          <label htmlFor="login-password" className="sr-only">Password</label>
          <input
            id="login-password"
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="w-full border border-crust rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-golden"
          />
          {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-golden hover:bg-golden-dark disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="text-center text-sm text-espresso/60 mt-4">
        Don&apos;t have an account? <Link href="/register" className="text-golden font-medium">Register</Link>
      </p>
    </main>
  );
}
