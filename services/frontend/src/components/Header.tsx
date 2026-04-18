"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface HeaderProps {
  onPipelineComplete: () => void;
}

export function Header({ onPipelineComplete }: HeaderProps) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const runPipeline = async () => {
    setRunning(true);
    setStatus("Running pipeline...");
    try {
      const result = await api.runPipeline();
      setStatus(
        `✓ ${result.events_found} events found, ${result.events_processed} processed`
      );
      onPipelineComplete();
    } catch (err) {
      setStatus(`✗ Pipeline failed: ${err}`);
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 8000);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          IS
        </div>
        <h1 className="text-xl font-bold text-slate-50">InsureShield</h1>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          Early Warning System
        </span>
      </div>
      <div className="flex items-center gap-4">
        {status && (
          <span className="text-sm text-slate-300 animate-pulse">{status}</span>
        )}
        <button
          onClick={runPipeline}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running...
            </>
          ) : (
            "▶ Run Pipeline"
          )}
        </button>
      </div>
    </header>
  );
}
