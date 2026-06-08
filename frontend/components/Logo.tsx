import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ href = "/", size = "md" }: LogoProps) {
  const sizes = {
    sm: { text: "text-2xl",  icon: "w-6 h-6",  bar: "w-1 h-4"   },
    md: { text: "text-3xl",  icon: "w-8 h-8",  bar: "w-1.5 h-5" },
    lg: { text: "text-5xl",  icon: "w-10 h-10", bar: "w-2 h-7"  },
  };
  const s = sizes[size];

  const mark = (
    <span className={`inline-flex items-center gap-2 select-none`}>
      {/* Icon mark — two overlapping rounded bars */}
      <span className={`relative flex-shrink-0 ${s.icon} flex items-center justify-center`}>
        <span className={`absolute left-0 ${s.bar} rounded-full bg-neutral-900`} />
        <span className={`absolute left-[45%] ${s.bar} rounded-full bg-neutral-900 opacity-30`} />
        <span className={`absolute right-0 ${s.bar} rounded-full bg-neutral-900`} />
      </span>

      {/* Wordmark */}
      <span className={`${s.text} font-black tracking-tighter leading-none`}>
        <span className="text-neutral-900">kuik</span>
        <span className="text-indigo-500 font-light">resume</span>
      </span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-center hover:opacity-80 transition-opacity">
      {mark}
    </Link>
  );
}
