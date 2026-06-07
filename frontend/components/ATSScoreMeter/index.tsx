"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ATSScoreMeterProps {
  score:     number;   // 0–100
  size?:     number;   // SVG size in px (default 120)
  label?:    string;
  animated?: boolean;
  className?: string;
}

function scoreColor(score: number) {
  if (score >= 80) return { stroke: "#16a34a", text: "text-green-600", label: "Excellent" };
  if (score >= 60) return { stroke: "#d97706", text: "text-yellow-600", label: "Good" };
  return             { stroke: "#dc2626", text: "text-red-500",    label: "Needs Work" };
}

export default function ATSScoreMeter({
  score,
  size = 120,
  label,
  animated = true,
  className,
}: ATSScoreMeterProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const clampedScore = Math.min(100, Math.max(0, score));
  const color        = scoreColor(clampedScore);

  const radius      = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDash  = (clampedScore / 100) * circumference;

  useEffect(() => {
    if (!circleRef.current || !animated) return;
    const el = circleRef.current;
    // Start from zero, animate to target
    el.style.strokeDashoffset = String(circumference);
    el.style.transition = "none";
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)";
      el.style.strokeDashoffset = String(circumference - strokeDash);
    });
  }, [clampedScore, circumference, strokeDash, animated]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            ref={circleRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? circumference : circumference - strokeDash}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold leading-none", color.text)}>
            {clampedScore}
          </span>
          <span className="text-xs text-slate-400 mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={cn("text-sm font-semibold", color.text)}>{color.label}</p>
        {label && <p className="text-xs text-slate-400 mt-0.5">{label}</p>}
      </div>
    </div>
  );
}

// ── Compact inline score badge ────────────────────────────────────────────────
export function ATSScoreInline({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const afterColor = scoreColor(after);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 line-through">{before}%</span>
      <svg width="16" height="8" viewBox="0 0 16 8" className="text-slate-300">
        <path d="M0 4h12M10 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5"
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className={cn("text-sm font-bold", afterColor.text)}>{after}%</span>
      {delta > 0 && (
        <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200
                         px-1.5 py-0.5 rounded-full">
          +{delta}%
        </span>
      )}
    </div>
  );
}
