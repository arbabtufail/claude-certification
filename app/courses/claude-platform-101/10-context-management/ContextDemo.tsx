"use client";

import { useState } from "react";
import { PATTERNS, type PatternId } from "@/lib/courses/claude-platform-101/lesson-10";
import { JitDemo } from "./JitDemo";
import { CompactionDemo } from "./CompactionDemo";
import { CachingDemo } from "./CachingDemo";
import { MemoryDemo } from "./MemoryDemo";

export function ContextDemo() {
  const [tab, setTab] = useState<PatternId>("jit");
  return (
    <>
      <section className="panel table-wrap">
        <table>
          <thead><tr><th>Pattern</th><th>What it fixes</th><th>Kind</th></tr></thead>
          <tbody>
            {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
              <tr key={id} className={tab === id ? "highlight" : undefined}>
                <td><b>{PATTERNS[id].label}</b></td><td className="wrap">{PATTERNS[id].fixes}</td><td>{PATTERNS[id].kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="tabs">
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{PATTERNS[id].label}</button>
        ))}
      </div>

      {/* Keep every demo mounted so switching tabs doesn't lose results */}
      <div hidden={tab !== "jit"}><JitDemo /></div>
      <div hidden={tab !== "compaction"}><CompactionDemo /></div>
      <div hidden={tab !== "caching"}><CachingDemo /></div>
      <div hidden={tab !== "memory"}><MemoryDemo /></div>
    </>
  );
}
