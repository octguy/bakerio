"use client";

import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User, Mail, LogOut } from "lucide-react";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, logout } = useAuth();

  return (
    <main className="max-w-sm mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-latte rounded-full flex items-center justify-center mx-auto mb-3">
          <User size={32} className="text-espresso/40" />
        </div>
        <h1 className="font-heading text-xl font-bold">{user?.display_name || user?.full_name || "User"}</h1>
      </div>

      <div className="bg-white border border-crust rounded-[10px] divide-y divide-crust">
        <div className="flex items-center gap-3 p-4">
          <Mail size={18} className="text-espresso/40" />
          <span className="text-sm">{user?.email}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full mt-6 flex items-center justify-center gap-2 border border-red-200 text-red-600 py-3 rounded-[10px] font-medium hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </main>
  );
}
