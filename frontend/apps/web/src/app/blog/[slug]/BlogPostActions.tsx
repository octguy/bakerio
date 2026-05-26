"use client";

import { useEffect, useState } from "react";

interface BlogPostActionsProps {
  slug: string;
  title: string;
}

const SAVED_POSTS_KEY = "bakerio:saved-posts";

export default function BlogPostActions({ slug, title }: BlogPostActionsProps) {
  const [saved, setSaved] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedPosts = JSON.parse(window.localStorage.getItem(SAVED_POSTS_KEY) || "[]");
      setSaved(Array.isArray(savedPosts) && savedPosts.includes(slug));
    } catch {
      setSaved(false);
    }
  }, [slug]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setShareLabel("Shared");
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareLabel("Copy failed");
    }
  };

  const handleSave = () => {
    try {
      const savedPosts = JSON.parse(window.localStorage.getItem(SAVED_POSTS_KEY) || "[]");
      const current = Array.isArray(savedPosts) ? savedPosts : [];
      const next = current.includes(slug)
        ? current.filter((savedSlug: string) => savedSlug !== slug)
        : [...current, slug];

      window.localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(next));
      setSaved(next.includes(slug));
    } catch {
      setSaved((current) => !current);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-full border border-crust bg-white px-3 py-1.5 font-mono text-[11px] text-cocoa"
      >
        <span className="text-cinnamon">↗</span> {shareLabel}
      </button>
      <button
        type="button"
        onClick={handleSave}
        aria-pressed={saved}
        className="inline-flex items-center gap-2 rounded-full border border-crust bg-white px-3 py-1.5 font-mono text-[11px] text-cocoa"
      >
        <span className="text-cinnamon">★</span> {saved ? "Saved" : "Save"}
      </button>
    </>
  );
}
