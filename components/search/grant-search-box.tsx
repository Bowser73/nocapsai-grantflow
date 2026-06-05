"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Find opioid awareness grants in Indiana",
  "Find youth sports grants for a nonprofit",
  "Find mental health and recovery grants under $100,000",
  "Find federal grants for community outreach programs",
  "Find small business technology grants",
];

export function GrantSearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  function handleSearch(q = query) {
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  async function handleLiveSearch() {
    const q = query.trim();
    if (!q) return;
    setIsLiveSearching(true);
    setLiveError(null);
    try {
      const res = await fetch("/api/agents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
      }
      // Upsert complete — reload search page so server picks up new DB rows
      router.push(`/search?q=${encodeURIComponent(q)}&live=1`);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : "Live search failed");
    } finally {
      setIsLiveSearching(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-gray-900">AI Grant Search</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Search your existing grant library, or hit <strong>Search Live</strong> to pull
        fresh results directly from Grants.gov.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder='e.g. "youth workforce development grants for nonprofits"'
          />
        </div>
        <Button onClick={() => handleSearch()} icon={<Search size={15} />}>
          Search
        </Button>
        <Button
          onClick={handleLiveSearch}
          disabled={isLiveSearching || !query.trim()}
          variant="secondary"
          icon={
            isLiveSearching
              ? <Loader2 size={15} className="animate-spin" />
              : <Zap size={15} className="text-amber-500" />
          }
        >
          {isLiveSearching ? "Searching Grants.gov…" : "Search Live"}
        </Button>
      </div>

      {liveError && (
        <p className="text-xs text-red-600 mt-2">
          Live search failed: {liveError}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); handleSearch(s); }}
            className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
