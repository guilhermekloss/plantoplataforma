interface PlantorLogoProps {
  className?: string;
  withWordmark?: boolean;
}

/** Hexágono terracota — identidade visual da Plantor. */
export function PlantorLogo({ className, withWordmark = true }: PlantorLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
        <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="#dd5e2e" />
        <path
          d="M50 30 C 35 30, 30 45, 35 60 C 40 68, 50 70, 50 70 C 50 70, 60 68, 65 60 C 70 45, 65 30, 50 30 Z"
          fill="#ffffff"
        />
      </svg>
      {withWordmark && <span className="text-xl font-semibold tracking-tight text-neutral-900">Plantor</span>}
    </span>
  );
}
