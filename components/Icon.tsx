/**
 * Petit jeu d'icônes dessinées au trait, dans l'esprit des illustrations
 * de référence : traits arrondis, formes simples, une seule couleur héritée
 * du texte (donc automatiquement juste en thème clair comme en sombre).
 */

export type IconName =
  // rayons
  | "pomme"
  | "baguette"
  | "viande"
  | "poisson"
  | "fromage"
  | "conserve"
  | "gateau"
  | "bouteille"
  | "flocon"
  | "spray"
  | "carton"
  | "bol"
  // navigation
  | "calendrier"
  | "liste"
  | "panier"
  // actions
  | "lien"
  | "restes"
  | "croix"
  | "coche"
  | "plus"
  | "precedent"
  | "suivant"
  | "points"
  | "copier"
  | "trier"
  | "poubelle"
  | "resync"
  | "etoile";

/** Icônes pleines : elles se dessinent en aplat, pas au trait. */
const FILLED = new Set<IconName>(["etoile", "points"]);

const PATHS: Record<IconName, React.ReactNode> = {
  pomme: (
    <>
      <path d="M12 8c-1-.7-2.2-1-3.2-.7C6.6 7.9 5.5 9.8 5.5 12c0 3.7 2.6 7.5 4.6 7.5.7 0 1.3-.3 1.9-.3s1.2.3 1.9.3c2 0 4.6-3.8 4.6-7.5 0-2.2-1.1-4.1-3.3-4.7-1-.3-2.2 0-3.2.7z" />
      <path d="M12 7.8V5.2" />
      <path d="M12.3 6.2c.6-1.3 2.1-2 3.4-1.7-.1 1.4-1.3 2.4-2.7 2.5" />
    </>
  ),
  baguette: (
    <>
      <path d="M6.2 17.8c-1.1-1.1-.9-3.1.5-4.5l6.6-6.6c1.4-1.4 3.4-1.6 4.5-.5 1.1 1.1.9 3.1-.5 4.5l-6.6 6.6c-1.4 1.4-3.4 1.6-4.5.5z" />
      <path d="M9.2 12.6l1.4 1.4M11.4 10.4l1.4 1.4M13.6 8.2l1.4 1.4" />
    </>
  ),
  // Pilon : la chair en haut, l'os en biais terminé par ses deux renflements.
  viande: (
    <>
      <ellipse cx="15" cy="8.6" rx="5.1" ry="4.2" transform="rotate(-40 15 8.6)" />
      <path d="M11.4 11.7 7.2 16" />
      <circle cx="7.9" cy="17.5" r="1.9" />
      <circle cx="5.9" cy="15.5" r="1.9" />
    </>
  ),
  poisson: (
    <>
      <path d="M2.5 12c2.1-3 4.9-4.5 7.7-4.5S16 9 18.1 12c-2.1 3-4.9 4.5-7.7 4.5S4.6 15 2.5 12z" />
      <path d="M18.1 12c1.2-1.1 2.4-1.8 3.4-2v4c-1-.2-2.2-.9-3.4-2z" />
      <circle cx="7.2" cy="11" r=".9" />
    </>
  ),
  // Part de fromage : un triangle posé à plat, avec ses trous.
  fromage: (
    <>
      <path d="M3.8 17.2 18.9 7.7c1.2-.8 2.6 0 2.6 1.4v8.1z" />
      <circle cx="9.6" cy="15.6" r="1" />
      <circle cx="14.2" cy="14.4" r="1.1" />
      <circle cx="18" cy="13.4" r=".9" />
    </>
  ),
  conserve: (
    <>
      <ellipse cx="12" cy="6.6" rx="5.5" ry="2.3" />
      <path d="M6.5 6.6v10.8c0 1.3 2.5 2.3 5.5 2.3s5.5-1 5.5-2.3V6.6" />
      <path d="M6.7 10.6h10.6" />
    </>
  ),
  // Bol fumant : le rayon des produits du monde.
  bol: (
    <>
      <path d="M3.4 10.8h17.2a8.6 8.6 0 0 1-17.2 0z" />
      <path d="M9.6 19.7h4.8" />
      <path d="M9.5 7.6c1.6-1.1 1.6-2.9 0-4" />
      <path d="M14.5 7.6c1.6-1.1 1.6-2.9 0-4" />
    </>
  ),
  gateau: (
    <>
      <path d="M6 11.5c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5z" />
      <path d="M7 11.5 8.6 19c.1.6.6 1 1.2 1h4.4c.6 0 1.1-.4 1.2-1l1.6-7.5z" />
      <circle cx="12" cy="4.9" r="1.2" />
    </>
  ),
  bouteille: (
    <>
      <path d="M10 3.5h4v2.8c0 .8.3 1.5.8 2.1l.9 1.1c.5.6.8 1.4.8 2.2v6.8c0 1.4-1.1 2.5-2.5 2.5h-4C8.6 21 7.5 19.9 7.5 18.5v-6.8c0-.8.3-1.6.8-2.2l.9-1.1c.5-.6.8-1.3.8-2.1V3.5z" />
      <path d="M7.6 14h8.8" />
    </>
  ),
  flocon: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="M9.8 5.2 12 7.4l2.2-2.2M9.8 18.8 12 16.6l2.2 2.2" />
    </>
  ),
  spray: (
    <>
      <path d="M8.5 10h6.5c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2v-7c0-1.1.9-2 2-2z" />
      <path d="M9.8 10V7.4h3.9V10" />
      <path d="M13.7 8.4h3.6" />
      <path d="M18.2 6.6l2-1M18.2 8.4h2.2M18.2 10.2l2 1" />
    </>
  ),
  carton: (
    <>
      <path d="M4 8.5 12 5l8 3.5v7L12 19l-8-3.5z" />
      <path d="M4 8.5 12 12l8-3.5M12 12v7" />
    </>
  ),
  calendrier: (
    <>
      <path d="M4.5 6.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" />
      <path d="M3.5 10.5h17M8 4v4M16 4v4" />
    </>
  ),
  liste: (
    <>
      <path d="M8.5 7.5h11M8.5 12h11M8.5 16.5h11" />
      <circle cx="5" cy="7.5" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="16.5" r="1" />
    </>
  ),
  panier: (
    <>
      <path d="M4 9h16l-1.4 9.2c-.2 1-1 1.8-2 1.8H7.4c-1 0-1.8-.8-2-1.8L4 9z" />
      <path d="M8.6 9 10.1 4.5M15.4 9 13.9 4.5" />
      <path d="M9.6 12.6l.6 4.4M14.4 12.6l-.6 4.4" />
    </>
  ),
  lien: (
    <>
      <path d="M10.6 13.4a3.5 3.5 0 0 0 5 0l2.9-3a3.5 3.5 0 0 0-5-5l-1.4 1.5" />
      <path d="M13.4 10.6a3.5 3.5 0 0 0-5 0l-2.9 3a3.5 3.5 0 0 0 5 5l1.4-1.5" />
    </>
  ),
  restes: (
    <>
      <path d="M17.6 9.6A6 6 0 0 0 6.6 11" />
      <path d="M6.4 14.4a6 6 0 0 0 11 -1.4" />
      <path d="M17.6 6.6v3h-3M6.4 17.4v-3h3" />
    </>
  ),
  croix: <path d="M7 7l10 10M17 7 7 17" />,
  coche: <path d="M5 12.5 9.5 17 19 7.5" />,
  plus: <path d="M12 6v12M6 12h12" />,
  precedent: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  suivant: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  points: (
    <>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </>
  ),
  copier: (
    <>
      <path d="M9.5 8.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 19v-9a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M5.5 15.5A1.5 1.5 0 0 1 4 14V5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 16 5v.5" />
    </>
  ),
  trier: <path d="M12 4.5v15M8 8l4-4 4 4M8 16l4 4 4-4" />,
  poubelle: (
    <>
      <path d="M5.5 8h13M9.5 8V5.5h5V8" />
      <path d="M7 8l.9 11.1c.1 1 .9 1.9 2 1.9h4.2c1.1 0 1.9-.8 2-1.9L17 8" />
    </>
  ),
  resync: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4.8v3.7h-3.7" />
    </>
  ),
  etoile: (
    <path d="M21.5 12 13.6 11.4 16.2 7.8 12.7 10.4 12 2.5 11.4 10.4 7.8 7.8 10.4 11.4 2.5 12 10.4 12.7 7.8 16.2 11.4 13.6 12 21.5 12.7 13.6 16.2 16.2 13.6 12.7z" />
  ),
};

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const filled = FILLED.has(name);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
