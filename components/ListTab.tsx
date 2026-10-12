"use client";

import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import Sheet from "./Sheet";
import Icon from "./Icon";
import Illustration from "./Illustration";
import type { ListGroup, ListItem } from "@/lib/shopping";

type Props = {
  groups: ListGroup[];
  checked: Record<string, Record<string, number>>;
  onToggle: (item: ListItem) => void;
  onResync: () => void;
  onReset: () => void;
  onChangeCategory: (key: string, category: string) => void;
  onGoToIngredients: () => void;
  syncing: boolean;
  /** État d'envoi des cochages : sert à prévenir quand le réseau manque. */
  sync: { unsent: number; offline: boolean };
};

export default function ListTab({
  groups,
  checked,
  onToggle,
  onResync,
  onReset,
  onChangeCategory,
  onGoToIngredients,
  syncing,
  sync,
}: Props) {
  const [showChecked, setShowChecked] = useState(false);
  const [selected, setSelected] = useState<ListItem | null>(null);

  const all = groups.flatMap((g) => g.items);
  const total = all.length;
  const done = all.filter((i) => checked[i.key]).length;
  const finished = total > 0 && done === total;

  if (total === 0) {
    return (
      <div className="card empty-card wide">
        <Illustration name="panier" size={130} />
        <p>
          <b>Le panier est vide.</b>
          Ajoute des ingrédients à tes plats, ou des produits hors menu, et ils viendront se
          ranger ici par rayon.
          <button className="btn primary" onClick={onGoToIngredients}>
            Aller aux ingrédients
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <section className={`recap${finished ? " finished" : ""}`}>
        <Illustration name={finished ? "fete" : "panier"} size={120} className="recap-art" />
        <div className="recap-body">
          {finished ? (
            <>
              <h2>Tout est dans le caddie</h2>
              <p>
                {total === 1
                  ? "Le seul article de la liste est validé. Bonne route !"
                  : `Les ${total} articles de la liste sont validés. Bonne route !`}
              </p>
            </>
          ) : (
            <>
              <h2>
                <b>{total - done}</b> article{total - done > 1 ? "s" : ""} à prendre
              </h2>
              <p>
                {done} sur {total} déjà dans le caddie · {groups.length} rayon
                {groups.length > 1 ? "s" : ""} à traverser
              </p>
            </>
          )}
          <div className="bar">
            <i style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <div className="recap-actions">
            <button className="btn" onClick={onResync} disabled={syncing}>
              <Icon name="resync" size={17} />
              {syncing ? "Synchro…" : "Resynchroniser"}
            </button>
            <button className="btn" onClick={onReset} disabled={done === 0}>
              Tout décocher
            </button>
          </div>
          {sync.offline && sync.unsent > 0 && (
            <p className="offline">
              Pas de réseau : {sync.unsent === 1 ? "une case" : `${sync.unsent} cases`} pas encore
              partagée{sync.unsent === 1 ? "" : "s"}. Rien n’est perdu, ça part tout seul dès que
              la connexion revient.
            </p>
          )}
        </div>
      </section>

      <div className="cards">
        {groups.map((group) => {
          const items = showChecked ? group.items : group.items.filter((i) => !checked[i.key]);
          if (!items.length) return null;
          const left = group.items.filter((i) => !checked[i.key]).length;
          return (
            <section className="card" key={group.category} data-cat={group.category}>
              <h3 className="card-head">
                <span className="chip">
                  <Icon name={group.icon} size={18} />
                </span>
                <span className="grow">{group.label}</span>
                <span className="tag">
                  {left} / {group.items.length}
                </span>
              </h3>
              <div className="card-body">
                {items.map((item) => (
                  <Row
                    key={item.key}
                    item={item}
                    done={Boolean(checked[item.key])}
                    onToggle={onToggle}
                    onLongPress={setSelected}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="note">
        Les cases cochées sont partagées : si vous faites les courses à deux, ce que l’un coche
        apparaît chez l’autre en quelques secondes.
      </p>

      {done > 0 && (
        <button className="btn ghost" onClick={() => setShowChecked((v) => !v)}>
          {showChecked
            ? "Masquer les articles cochés"
            : done === 1
              ? "Afficher l’article coché"
              : `Afficher les ${done} articles cochés`}
        </button>
      )}

      {selected && (
        <Sheet
          title={selected.name}
          subtitle={selected.sources.length ? selected.sources.join(" · ") : "Ajouté hors menu"}
          onClose={() => setSelected(null)}
        >
          {selected.rawNames.length > 0 && (
            <p className="sub">Écrit dans tes ingrédients : « {selected.rawNames.join(" », « ")} »</p>
          )}
          <p className="sub">Changer de rayon</p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="sheet-row"
              aria-current={cat.id === selected.category}
              onClick={() => {
                onChangeCategory(selected.key, cat.id);
                setSelected(null);
              }}
            >
              <Icon name={cat.icon} size={21} />
              <span className="grow">{cat.label}</span>
              {cat.id === selected.category && <Icon name="coche" size={18} />}
            </button>
          ))}
        </Sheet>
      )}
    </>
  );
}

function Row({
  item,
  done,
  onToggle,
  onLongPress,
}: {
  item: ListItem;
  done: boolean;
  onToggle: (item: ListItem) => void;
  onLongPress: (item: ListItem) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <button
      className={`item${done ? " done" : ""}`}
      onPointerDown={(e) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = setTimeout(() => {
          fired.current = true;
          onLongPress(item);
        }, 450);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const far =
          Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10;
        if (far) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onToggle(item);
      }}
    >
      <span className="tick">
        <Icon name="coche" size={15} />
      </span>
      <span className="name">
        {item.name}
        {!item.known && !item.overridden && (
          <em>rangé dans Autres — appui long pour choisir le rayon</em>
        )}
      </span>
      {item.qtyLabel && <span className="qty">{item.qtyLabel}</span>}
    </button>
  );
}
