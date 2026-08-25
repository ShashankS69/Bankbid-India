"use client";

import { useState } from "react";
import { triggerFetchAll } from "@/lib/api";

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 text-gold"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function FetchLatestButton({ onDone }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);

  async function handleClick() {
    setState("loading");
    setResult(null);
    try {
      const data = await triggerFetchAll();
      setResult(data);
      setState("done");
      onDone?.();
    } catch (err) {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-sm border border-gold text-gold hover:bg-gold hover:text-ledger transition-colors disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gold"
      >
        {state === "loading" && <Spinner />}
        {state === "loading" ? "Fetching…" : "Fetch latest listings"}
      </button>

      {state === "done" && result && (
        <div className="text-[11px] font-mono text-right leading-relaxed">
          <p className="text-moss">
            {result.total_new_listings ?? 0} new listing
            {result.total_new_listings === 1 ? "" : "s"} pushed
          </p>
          {result.sources && (
            <p className="text-slate-dim">
              {Object.entries(result.sources)
                .map(([src, r]) => {
                  const hasErrors = Array.isArray(r.errors) && r.errors.length > 0;
                  if (hasErrors && (r.pushed ?? 0) === 0) {
                    return `${src}: failed (${r.errors.length} err)`;
                  }
                  if (hasErrors) {
                    return `${src}: ${r.pushed} pushed, ${r.errors.length} err`;
                  }
                  return `${src}: ${r.pushed ?? 0} pushed`;
                })
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {state === "error" && (
        <p className="text-[11px] font-mono text-rust">
          Couldn&apos;t reach the backend — is uvicorn running on :8000?
        </p>
      )}
    </div>
  );
}