/**
 * Illustrations dessinées à la main, en traits épais et aplats de couleur.
 *
 * Le contour utilise `currentColor` : posée sur un fond clair ou sur le vert
 * foncé du panneau latéral, chaque illustration reste lisible. Les aplats
 * passent par des variables CSS (`--il-a` … `--il-d`) pour pouvoir être
 * retouchés depuis la feuille de style sans revenir ici.
 */

export type IllustrationName = "marmite" | "carnet" | "panier" | "fete" | "etal";

const A = "var(--il-a, #f2b134)"; // jaune ambré
const B = "var(--il-b, #e0563c)"; // corail
const C = "var(--il-c, #7fa88f)"; // vert sauge
const D = "var(--il-d, #fbf9f4)"; // crème

function Marmite() {
  return (
    <>
      {/* vapeur */}
      <g fill="none" strokeLinecap="round">
        <path d="M46 32c6-4 6-11 0-15" opacity="0.55" />
        <path d="M60 26c7-5 7-13 0-18" opacity="0.8" />
        <path d="M74 32c6-4 6-11 0-15" opacity="0.55" />
      </g>
      {/* corps */}
      <path d="M28 54h64v30a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12Z" fill={B} />
      {/* anses */}
      <path d="M28 62c-7 0-11 4-11 9s4 9 11 9M92 62c7 0 11 4 11 9s-4 9-11 9" fill="none" />
      {/* couvercle */}
      <rect x="20" y="44" width="80" height="12" rx="6" fill={D} />
      <circle cx="60" cy="38" r="5" fill={A} />
      {/* bulles dans la marmite */}
      <circle cx="48" cy="74" r="3.5" fill={D} opacity="0.9" />
      <circle cx="66" cy="82" r="2.5" fill={D} opacity="0.9" />
      <path d="M32 104h56" fill="none" strokeLinecap="round" opacity="0.35" />
    </>
  );
}

function Carnet() {
  return (
    <>
      {/* pages */}
      <path d="M14 32c14-6 30-6 46 4v58c-16-10-32-10-46-4Z" fill={D} />
      <path d="M106 32c-14-6-30-6-46 4v58c16-10 32-10 46-4Z" fill={D} />
      <path d="M60 36v58" fill="none" />
      {/* lignes de recette */}
      <g fill="none" strokeLinecap="round" opacity="0.4">
        <path d="M24 48h24M24 58h20M24 68h24M72 58h22M72 68h18" />
      </g>
      {/* carotte marque-page */}
      <path d="M76 30c8 4 12 10 10 18-8 2-14-2-17-9Z" fill={B} />
      <path d="M86 26c5-4 11-4 14 0-3 5-9 6-14 3Z" fill={C} />
      <circle cx="34" cy="86" r="0" fill="none" />
    </>
  );
}

function Panier() {
  return (
    <>
      {/* poignée */}
      <path d="M42 54c0-16 8-24 18-24s18 8 18 24" fill="none" />
      {/* corps */}
      <path d="M26 62h68l-7 32a8 8 0 0 1-8 6H41a8 8 0 0 1-8-6Z" fill={D} />
      {/* tressage */}
      <g fill="none" opacity="0.35">
        <path d="M44 64l4 36M60 64v36M76 64l-4 36M30 78h60M32 90h56" />
      </g>
      {/* rebord */}
      <rect x="20" y="54" width="80" height="12" rx="6" fill={C} />
    </>
  );
}

function Fete() {
  return (
    <>
      {/* étincelles */}
      <g fill={A}>
        <path d="M22 30l2.5 6 6 2.5-6 2.5L22 47l-2.5-6-6-2.5 6-2.5Z" />
        <path d="M100 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
      </g>
      {/* légumes qui débordent */}
      <circle cx="45" cy="52" r="11" fill={B} />
      <path d="M45 41c-3-4-1-7 3-7-1 4-1 6-3 7Z" fill={C} />
      <path d="M70 58c-3-12 1-20 8-22 4 8 2 18-8 22Z" fill={A} />
      <path d="M78 36c4-5 10-5 13-1-4 5-9 6-13 1Z" fill={C} />
      <ellipse cx="60" cy="58" rx="9" ry="7" fill={C} />
      {/* corps du panier */}
      <path d="M26 62h68l-7 32a8 8 0 0 1-8 6H41a8 8 0 0 1-8-6Z" fill={D} />
      <g fill="none" opacity="0.35">
        <path d="M44 64l4 36M60 64v36M76 64l-4 36M30 78h60M32 90h56" />
      </g>
      <rect x="20" y="54" width="80" height="12" rx="6" fill={A} />
    </>
  );
}

function Etal() {
  return (
    <>
      {/* poireau */}
      <path d="M22 96c-4-10-2-22 6-30 6 8 7 20 2 30Z" fill={D} />
      <path d="M28 66c-1-10 2-18 7-22 3 8 2 17-3 23ZM28 66c-6-8-7-17-4-22 6 5 9 13 8 21Z" fill={C} />
      {/* tomate */}
      <circle cx="62" cy="80" r="18" fill={B} />
      <path d="M62 62c-4-6-1-11 5-11-1 6-2 9-5 11Z" fill={C} />
      {/* citron */}
      <ellipse cx="98" cy="84" rx="16" ry="13" fill={A} />
      <path d="M112 84c3 0 5-1 6-3-2-2-4-2-6-1Z" fill={C} />
      <path d="M8 98h108" fill="none" strokeLinecap="round" opacity="0.35" />
    </>
  );
}

const SHAPES: Record<IllustrationName, () => React.JSX.Element> = {
  marmite: Marmite,
  carnet: Carnet,
  panier: Panier,
  fete: Fete,
  etal: Etal,
};

export default function Illustration({
  name,
  size = 120,
  className,
}: {
  name: IllustrationName;
  size?: number;
  className?: string;
}) {
  const Shape = SHAPES[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinejoin="round"
    >
      <Shape />
    </svg>
  );
}
