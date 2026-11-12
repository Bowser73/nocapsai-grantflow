"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  states: { code: string; name: string }[];
  loaded: { state: string; count: number; refreshed: string | null }[];
  defaultState: string;
}

export function FoundationImportPanel({ states, loaded, defaultState }: Props) {
  const router = useRouter();
  const [state, setState] = useState(defaultState);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/foundations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Import failed.");
      setNote({ ok: true, text: `Loaded ${body.foundations.toLocaleString()} funders for ${state} from the IRS file.` });
      router.refresh();
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Import failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Foundation Finder uses the IRS&apos;s public list of tax-exempt organizations. Load a state here;
        after that it refreshes automatically each month. Large states can take up to a minute.
      </p>
      {loaded.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1">
          {loaded.map((l) => (
            <li key={l.state}>
              <span className="font-medium text-gray-800">{l.state}</span> · {l.count.toLocaleString()} funders
              {l.refreshed ? ` · refreshed ${l.refreshed}` : ""}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="h-9 rounded-md border border-gray-200 px-2 text-sm bg-white"
          aria-label="State to load"
        >
          {states.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={run} loading={busy}>Load or refresh</Button>
      </div>
      {note && <p className={`text-xs ${note.ok ? "text-green-700" : "text-red-600"}`}>{note.text}</p>}
    </div>
  );
}
