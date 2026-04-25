interface Props {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export function Slicer({ label, options, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
