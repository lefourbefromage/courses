"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { DAYS, SLOTS, dayLabel } from "@/lib/dates";
import type { SlotId } from "@/lib/dates";
import type { Meal } from "@/lib/types";
import { PEER_COLORS, type Peer } from "./App";
import { linkHost } from "@/lib/links";
import Icon from "./Icon";

type Props = {
  weekStart: string;
  meals: Meal[];
  onTitleChange: (day: number, slot: SlotId, title: string) => void;
  /** Ouvre le sélecteur « restes de quel repas ? ». */
  onPickLeftover: (day: number, slot: SlotId) => void;
  onClearLeftover: (day: number, slot: SlotId) => void;
  /** Faux quand aucun repas de la semaine ne peut servir de source. */
  canUseLeftovers: boolean;
  /** Autres personnes actuellement sur cette semaine. */
  peers: Peer[];
  onFocusCell: (cell: { day: number; slot: SlotId } | null) => void;
  /** Ouvre le panneau du lien de recette. */
  onEditLink: (day: number, slot: SlotId) => void;
};

/**
 * Zone de saisie qui s'agrandit avec son contenu : un nom de plat long ne doit
 * jamais être coupé.
 */
function GrowingInput({
  value,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const height = `${el.scrollHeight}px`;
    if (el.style.height !== height) el.style.height = height;
  }, []);

  useLayoutEffect(fit, [value, fit]);

  // La largeur d'une case change avec la taille de la fenêtre, et la police
  // arrive après le premier affichage : dans les deux cas il faut remesurer,
  // sinon un nom de plat long reste coupé.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  return <textarea ref={ref} rows={1} value={value} {...rest} />;
}

/**
 * Une colonne par jour, deux créneaux par colonne. Sur grand écran les sept
 * jours tiennent côte à côte ; en dessous, les colonnes se replient d'elles
 * mêmes jusqu'à devenir une simple pile de journées sur téléphone.
 */
export default function MenuTab({
  weekStart,
  meals,
  onTitleChange,
  onPickLeftover,
  onClearLeftover,
  canUseLeftovers,
  peers,
  onFocusCell,
  onEditLink,
}: Props) {
  const mealAt = (day: number, slot: SlotId) =>
    meals.find((m) => m.day === day && m.slot === slot);

  const sourceOf = (meal: Meal) =>
    meal.leftoverOf === null ? null : (meals.find((m) => m.id === meal.leftoverOf) ?? null);

  const peerAt = (day: number, slot: SlotId) =>
    peers.find((p) => p.day === day && p.slot === slot) ?? null;

  return (
    <>
      <div className="week">
        {DAYS.map((name, day) => (
          <section className="day" key={name}>
            <header className="day-head">
              <b>{name}</b>
              <small>{dayLabel(weekStart, day)}</small>
            </header>

            {SLOTS.map((slot) => {
              const meal = mealAt(day, slot.id);
              const source = meal ? sourceOf(meal) : null;
              const isLeftover = Boolean(meal && meal.leftoverOf !== null);
              const titled = Boolean(meal?.title.trim());
              const peer = peerAt(day, slot.id);

              return (
                <div
                  key={slot.id}
                  className={`slot${isLeftover ? " leftover" : ""}${peer ? " peer" : ""}`}
                  style={
                    peer
                      ? ({ "--peer": PEER_COLORS[peer.color % PEER_COLORS.length] } as React.CSSProperties)
                      : undefined
                  }
                  title={peer ? "Quelqu’un est en train de modifier cette case" : undefined}
                >
                  <span className="slot-name">{slot.label}</span>

                  {isLeftover ? (
                    <p className="dish">
                      <Icon name="restes" size={16} />
                      {source ? source.title : "Restes"}
                    </p>
                  ) : (
                    <GrowingInput
                      value={meal?.title ?? ""}
                      placeholder="Quel plat ?"
                      aria-label={`${name} ${slot.label}`}
                      onFocus={() => onFocusCell({ day, slot: slot.id })}
                      onBlur={() => onFocusCell(null)}
                      onChange={(e) => onTitleChange(day, slot.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  )}

                  <div className="slot-foot">
                    {isLeftover ? (
                      <>
                        {source?.link ? (
                          <a
                            className="mini on"
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Recette : ${linkHost(source.link)}`}
                          >
                            <Icon name="lien" size={16} />
                          </a>
                        ) : (
                          <span />
                        )}
                        <button
                          className="mini"
                          onClick={() => onClearLeftover(day, slot.id)}
                          aria-label={`Annuler les restes du ${name} ${slot.label}`}
                          title={
                            source ? `Restes de ${source.title} — annuler` : "Annuler les restes"
                          }
                        >
                          <Icon name="croix" size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        {titled ? (
                          <button
                            className={`mini${meal!.link ? " on" : ""}`}
                            onClick={() => onEditLink(day, slot.id)}
                            title={
                              meal!.link
                                ? `Recette : ${linkHost(meal!.link)}`
                                : "Ajouter le lien de la recette"
                            }
                            aria-label={`${name} ${slot.label} : lien de la recette`}
                          >
                            <Icon name="lien" size={16} />
                          </button>
                        ) : (
                          <span />
                        )}
                        {/* Une case déjà remplie est un plat cuisiné : les restes
                            ne concernent que les cases vides, et le bouton
                            n'apparaît que dans la case active. */}
                        {canUseLeftovers && !titled && (
                          <button
                            className="mini leftover-btn"
                            // Empêche la case de perdre le focus au moment du
                            // clic : sans ça le bouton disparaîtrait avant que
                            // le clic n'aboutisse.
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => onPickLeftover(day, slot.id)}
                            title="Ce repas est les restes d’un autre"
                            aria-label={`${name} ${slot.label} : marquer comme restes`}
                          >
                            <Icon name="restes" size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {peers.length > 0 && (
        <p className="note peers">
          {peers.length === 1
            ? "Une autre personne remplit ce menu en même temps que toi."
            : `${peers.length} autres personnes remplissent ce menu en même temps que toi.`}{" "}
          Les cases entourées de couleur sont en cours de modification.
        </p>
      )}
      <p className="note">
        Écris le nom du repas dans chaque case.{" "}
        {canUseLeftovers
          ? "Le bouton de reprise, dans une case vide, sert à dire « c’est les restes d’un plat déjà cuisiné » : ses ingrédients ne seront pas rachetés. Le trombone garde le lien de la recette."
          : "Dès qu’un repas est écrit, un bouton de reprise apparaît dans les cases vides pour dire « c’est les restes de ce plat » — ses ingrédients ne seront alors pas rachetés."}
      </p>
    </>
  );
}
