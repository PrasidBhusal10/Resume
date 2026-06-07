"use client";

// Simple before/after diff display for resume sections.
// Shows JSON as formatted text in two columns with color highlighting.

interface Props {
  original:  unknown;
  suggested: unknown;
}

export default function SectionDiff({ original, suggested }: Props) {
  const originalText  = JSON.stringify(original,  null, 2);
  const suggestedText = JSON.stringify(suggested, null, 2);

  return (
    <div className="grid grid-cols-2 divide-x divide-surface-border text-xs font-mono
                    max-h-64 overflow-auto">
      <div className="p-3 bg-red-50">
        <p className="text-red-500 font-semibold mb-2 font-sans text-xs uppercase tracking-wide">
          Before
        </p>
        <pre className="text-red-700 whitespace-pre-wrap break-words leading-relaxed">
          {originalText}
        </pre>
      </div>
      <div className="p-3 bg-green-50">
        <p className="text-green-600 font-semibold mb-2 font-sans text-xs uppercase tracking-wide">
          After (AI)
        </p>
        <pre className="text-green-800 whitespace-pre-wrap break-words leading-relaxed">
          {suggestedText}
        </pre>
      </div>
    </div>
  );
}
