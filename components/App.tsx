"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MenuTab from "./MenuTab";
import IngredientsTab from "./IngredientsTab";
import ListTab from "./ListTab";
import Sheet from "./Sheet";
import Icon, { type IconName } from "./Icon";
import Illustration from "./Illustration";
import { buildList, quantityIncreased } from "@/lib/shopping";
import { CATEGORIES, categoryIcon, categoryLabel, resolveOrder } from "@/lib/categories";
import { DAYS, SLOTS, addWeeks, currentWeekStart, weekLabel, weekWhen } from "@/lib/dates";
import type { SlotId } from "@/lib/dates";
import type { Meal, Prefs, WeekState } from "@/lib/types";
import { linkHost, normalizeLink } from "@/lib/links";

type Tab = "menu" | "ingredients" | "courses";
type CheckedMap = Record<string, Record<string, number>>;
export type Peer = { clientId: string; day: number | null; slot: SlotId | null; color: number };
type Identity = { clientId: string; color: number };

/** Couleurs de présence : franches, pour repérer d'un coup d'œil qui édite quoi. */
export const PEER_COLORS = ["#e0563c", "#1c6fb4", "#b83280", "#0f7b7b", "#6d4bb8", "#2f8f4e"];

const PRESENCE_MS = 3000;

/**
 * Les cases cochées vivent dans la base, partagées entre les appareils. Ces
 * deux clés ne servent que de filet : un cache pour l'affichage immédiat (et
 * hors ligne), et la file des cochages pas encore envoyés.
 */
const CHECKED_KEY = "courses:checked";
const PENDING_KEY = "courses:checks-pending";
/** Semaine à laquelle ces deux clés se rapportent : périmées dès le lundi suivant. */
const CHECKED_WEEK_KEY = "courses:checked-week";
/** Marque le versement, une seule fois, des cochages d'avant le partage. */
const MIGRATED_KEY = "courses:checks-migrated";

const TABS: { id: Tab; label: string; icon: IconName; hint: string }[] = [
  { id: "menu", label: "Menu", icon: "calendrier", hint: "Les repas de la semaine" },
  { id: "ingredients", label: "Ingrédients", icon: "liste", hint: "Ce que demande chaque plat" },
  { id: "courses", label: "Courses", icon: "panier", hint: "La liste à emporter" },
];

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Une erreur est survenue.";
}

export default function App() {
  const [week, setWeek] = useState<string | null>(null);
  const [data, setData] = useState<WeekState | null>(null);
  const [tab, setTab] = useState<Tab>("menu");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<CheckedMap>({});
  const [sheet, setSheet] = useState<null | "reglages" | "order">(null);
  const [leftoverTarget, setLeftoverTarget] = useState<{ day: number; slot: SlotId } | null>(null);
  const [linkTarget, setLinkTarget] = useState<{ day: number; slot: SlotId } | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  /** Cochages qui n'ont pas encore pu partir, et pourquoi on le signale. */
  const [checkSync, setCheckSync] = useState({ unsent: 0, offline: false });

  /** Semaine en cours selon le fuseau du navigateur : début de l'horizon. */
  const horizon = useRef<string>("");

  /* ------------------------------------------------------------ réseau */

  const send = useCallback(async (path: string, init: RequestInit) => {
    setBusy((n) => n + 1);
    try {
      const res = await fetch(path, {
        headers: { "content-type": "application/json" },
        ...init,
      });
      if (res.status === 401) {
        window.location.replace("/login");
        return null;
      }
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error ?? "Enregistrement impossible."));
      setError(null);
      return json;
    } catch (err) {
      setError(message(err));
      return null;
    } finally {
      setBusy((n) => n - 1);
    }
  }, []);

  const load = useCallback(async (target: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/state?week=${target}&from=${horizon.current}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.replace("/login");
        return null;
      }
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error ?? "Chargement impossible."));
      setData(json as unknown as WeekState);
      setError(null);
      return json as unknown as WeekState;
    } catch (err) {
      setError(message(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // La semaine est calculée côté navigateur pour coller au fuseau du téléphone.
  useEffect(() => {
    const now = currentWeekStart();
    horizon.current = now;
    setWeek(now);
  }, []);

  // Identité locale de l'appareil : sert uniquement à distinguer les curseurs.
  useEffect(() => {
    const KEY = "courses:client";
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Identity;
        if (saved?.clientId) {
          setIdentity(saved);
          return;
        }
      }
    } catch {
      /* stockage indisponible : on repart d'une identité neuve */
    }
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const fresh: Identity = { clientId: random, color: Math.floor(Math.random() * PEER_COLORS.length) };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(fresh));
    } catch {
      /* rien à mémoriser, l'identité durera le temps de l'onglet */
    }
    setIdentity(fresh);
  }, []);

  useEffect(() => {
    if (week) void load(week);
  }, [week, load]);

  /* -------------------------------------------- enregistrement différé */

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, () => void>());
  /** Enregistrements partis au serveur mais pas encore confirmés. */
  const inflight = useRef(new Set<string>());
  /** Case et ingrédient dans lesquels le curseur se trouve maintenant. */
  const focusedMeal = useRef<string | null>(null);
  const focusedIngredient = useRef<number | null>(null);

  const schedule = useCallback(
    (key: string, fn: () => void | Promise<void>, delay = 700) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      const run = async () => {
        inflight.current.add(key);
        try {
          await fn();
        } finally {
          inflight.current.delete(key);
        }
      };
      pending.current.set(key, () => void run());
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          pending.current.delete(key);
          void run();
        }, delay),
      );
    },
    [],
  );

  const flush = useCallback(() => {
    for (const [key, timer] of timers.current) {
      clearTimeout(timer);
      const fn = pending.current.get(key);
      pending.current.delete(key);
      fn?.();
    }
    timers.current.clear();
  }, []);

  // Ne rien perdre si l'app passe en arrière-plan au milieu d'une saisie.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  /**
   * Applique l'état venu du serveur sans effacer ce qu'on est en train de
   * taper : les cases focalisées, celles dont l'enregistrement est programmé
   * et celles dont la requête est encore en vol gardent la valeur locale.
   */
  const mergeFresh = useCallback((fresh: WeekState) => {
    setData((prev) => {
      if (!prev || prev.weekStart !== fresh.weekStart || prev.from !== fresh.from) return fresh;

      const busy = new Set<string>([...timers.current.keys(), ...inflight.current]);
      const keepMeal = new Set<string>();
      const keepIngredient = new Set<number>();
      if (focusedMeal.current) keepMeal.add(focusedMeal.current);
      if (focusedIngredient.current !== null) keepIngredient.add(focusedIngredient.current);
      for (const key of busy) {
        if (key.startsWith("meal:")) keepMeal.add(key.slice(5));
        else if (key.startsWith("ing:")) keepIngredient.add(Number(key.slice(4)));
      }

      const cellOf = (m: Meal) => `${m.weekStart}:${m.day}:${m.slot}`;
      const localMeals = new Map(prev.meals.map((m) => [cellOf(m), m]));
      const meals = fresh.meals.map((m) => {
        const local = localMeals.get(cellOf(m));
        return keepMeal.has(cellOf(m)) && local ? { ...m, title: local.title } : m;
      });
      // Une case en cours de frappe qui n'existe pas encore côté serveur.
      for (const [cell, local] of localMeals) {
        if (keepMeal.has(cell) && !meals.some((m) => cellOf(m) === cell)) meals.push(local);
      }

      const localIngredients = new Map(prev.ingredients.map((i) => [i.id, i]));
      const ingredients = fresh.ingredients.map((i) => {
        const local = localIngredients.get(i.id);
        return keepIngredient.has(i.id) && local
          ? { ...i, name: local.name, qty: local.qty }
          : i;
      });

      return { ...fresh, meals, ingredients };
    });
  }, []);

  /* --------------------------------------------- cochages partagés */

  /**
   * Cochages tapés ici mais pas encore confirmés par le serveur.
   * `null` = décochage en attente. Ils gagnent toujours contre ce qui arrive
   * du réseau : sans ça, un aller-retour lent ferait clignoter la case.
   */
  const pendingChecks = useRef(new Map<string, Record<string, number> | null>());
  /** Cochages trouvés sur cet appareil au démarrage, avant tout appel réseau. */
  const localChecks = useRef<CheckedMap>({});
  const migrated = useRef(false);
  /**
   * Valeur courante des cases cochées, tenue à jour tout de suite.
   * React applique `setChecked` plus tard : deux appuis rapprochés liraient
   * sinon le même état de départ et le second serait perdu.
   */
  const checkedNow = useRef<CheckedMap>({});

  const writeChecked = useCallback((next: CheckedMap) => {
    checkedNow.current = next;
    setChecked(next);
  }, []);

  const rememberPending = useCallback(() => {
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify([...pendingChecks.current]));
    } catch {
      /* navigation privée : la file ne survivra pas à un rechargement */
    }
    setCheckSync((prev) => ({ ...prev, unsent: pendingChecks.current.size }));
  }, []);

  /** Vide la file vers le serveur ; en cas de coupure, on garde tout pour plus tard. */
  const flushChecks = useCallback(async () => {
    if (pendingChecks.current.size === 0) return;
    for (const [key, totals] of [...pendingChecks.current]) {
      try {
        const res = totals
          ? await fetch("/api/checks", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ key, totals, week: horizon.current }),
            })
          : await fetch(`/api/checks?key=${encodeURIComponent(key)}`, { method: "DELETE" });
        if (res.status === 401) {
          window.location.replace("/login");
          return;
        }
        // Le serveur a répondu : envoyé, ou refusé. Dans les deux cas on
        // n'insiste pas, sinon une donnée bancale bloquerait la file.
        if (pendingChecks.current.get(key) === totals) pendingChecks.current.delete(key);
      } catch {
        // Plus de réseau : on s'arrête là et on retentera au battement suivant.
        setCheckSync({ unsent: pendingChecks.current.size, offline: true });
        return;
      }
    }
    setCheckSync({ unsent: pendingChecks.current.size, offline: false });
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify([...pendingChecks.current]));
    } catch {
      /* rien à mémoriser */
    }
  }, []);

  /** Applique les cases venues du serveur, sans écraser la file locale. */
  const applyChecks = useCallback(
    (fresh: CheckedMap) => {
      const next: CheckedMap = { ...fresh };
      for (const [key, totals] of pendingChecks.current) {
        if (totals) next[key] = totals;
        else delete next[key];
      }
      writeChecked(next);
    },
    [writeChecked],
  );

  function toggleCheck(key: string, totals: Record<string, number>) {
    const next = { ...checkedNow.current };
    if (next[key]) {
      delete next[key];
      pendingChecks.current.set(key, null);
    } else {
      next[key] = totals;
      pendingChecks.current.set(key, totals);
    }
    writeChecked(next);
    rememberPending();
    void flushChecks();
  }

  async function resetChecks() {
    writeChecked({});
    pendingChecks.current.clear();
    rememberPending();
    await send("/api/checks?all=1", { method: "DELETE" });
  }

  // Au démarrage : le cache local s'affiche tout de suite (utile hors ligne),
  // la file en attente est reprise, et le serveur corrigera au premier appel.
  useEffect(() => {
    try {
      // Une nouvelle semaine a commencé : les cases d'avant ne valent plus rien.
      const thisWeek = currentWeekStart();
      if (window.localStorage.getItem(CHECKED_WEEK_KEY) !== thisWeek) {
        window.localStorage.removeItem(CHECKED_KEY);
        window.localStorage.removeItem(PENDING_KEY);
        window.localStorage.setItem(CHECKED_WEEK_KEY, thisWeek);
      }
      const raw =
        window.localStorage.getItem(CHECKED_KEY) ??
        window.localStorage.getItem(`courses:checked:${thisWeek}`);
      if (raw) {
        localChecks.current = JSON.parse(raw) as CheckedMap;
        writeChecked(localChecks.current);
      }
      const queued = window.localStorage.getItem(PENDING_KEY);
      if (queued) {
        for (const [key, totals] of JSON.parse(queued) as [string, Record<string, number> | null][]) {
          pendingChecks.current.set(key, totals);
        }
        setCheckSync({ unsent: pendingChecks.current.size, offline: false });
      }
    } catch {
      /* stockage illisible : on part de zéro, le serveur fera foi */
    }
  }, [writeChecked]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
    } catch {
      /* navigation privée : on continue sans mémoriser */
    }
  }, [checked]);

  /**
   * Le partage vient d'arriver : si la base n'a encore rien et que cet
   * appareil avait des cases cochées, on les verse pour que personne ne
   * retrouve une liste vierge en pleines courses. Une seule fois par appareil.
   */
  useEffect(() => {
    if (!data || migrated.current) return;
    migrated.current = true;
    void (async () => {
      try {
        if (window.localStorage.getItem(MIGRATED_KEY)) return;
        if (Object.keys(data.checks ?? {}).length > 0) {
          window.localStorage.setItem(MIGRATED_KEY, "1");
          return;
        }
        const local = localChecks.current;
        if (Object.keys(local).length === 0) {
          window.localStorage.setItem(MIGRATED_KEY, "1");
          return;
        }
        const res = await fetch("/api/checks", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entries: local, week: horizon.current }),
        });
        if (!res.ok) return; // on retentera au prochain démarrage
        window.localStorage.setItem(MIGRATED_KEY, "1");
        applyChecks(local);
      } catch {
        /* hors ligne : le versement attendra le prochain démarrage */
      }
    })();
  }, [data, applyChecks]);

  /* ---------------------------------------- présence et rafraîchissement */

  const ping = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!week || !identity) {
      setPeers([]);
      ping.current = null;
      return;
    }
    let stopped = false;
    // Sur la liste de courses, personne ne remplit de case : inutile de dire
    // où l'on est. Le reste du battement, lui, sert toujours — c'est par là
    // que les cases cochées de l'autre téléphone arrivent.
    const shopping = tab === "courses";

    async function tick() {
      if (stopped || document.visibilityState !== "visible") return;
      const cell = focusedMeal.current?.split(":");
      void flushChecks();
      try {
        if (shopping) {
          setPeers([]);
        } else {
          const res = await fetch("/api/presence", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              clientId: identity!.clientId,
              weekStart: week,
              day: cell ? Number(cell[1]) : null,
              slot: cell ? cell[2] : null,
              color: identity!.color,
            }),
          });
          if (res.ok && !stopped) {
            const json = (await res.json()) as { peers?: Peer[] };
            setPeers(json.peers ?? []);
          }
        }
        const state = await fetch(`/api/state?week=${week}&from=${horizon.current}`, {
          cache: "no-store",
        });
        if (state.ok && !stopped) {
          const fresh = (await state.json()) as WeekState;
          mergeFresh(fresh);
          applyChecks(fresh.checks ?? {});
        }
      } catch {
        // Réseau instable : on retentera au battement suivant, sans alarmer.
      }
    }

    ping.current = tick;
    void tick();
    const id = setInterval(tick, PRESENCE_MS);
    return () => {
      stopped = true;
      ping.current = null;
      clearInterval(id);
    };
  }, [week, tab, identity, mergeFresh, applyChecks, flushChecks]);

  /* --------------------------------------------------------- mutations */

  function changeTitle(day: number, slot: SlotId, title: string) {
    if (!week) return;
    setData((prev) => {
      if (!prev) return prev;
      const meals = [...prev.meals];
      const index = meals.findIndex(
        (m) => m.weekStart === week && m.day === day && m.slot === slot,
      );
      if (index >= 0) meals[index] = { ...meals[index], title };
      else
        meals.push({
          id: -(day * 10 + (slot === "midi" ? 1 : 2)),
          weekStart: week,
          day,
          slot,
          title,
          leftoverOf: null,
          link: "",
        });
      return { ...prev, meals };
    });

    schedule(`meal:${week}:${day}:${slot}`, async () => {
      const res = await send("/api/meals", {
        method: "PUT",
        body: JSON.stringify({ weekStart: week, day, slot, title }),
      });
      if (!res) return;
      const id = res.id as number | null;
      setData((prev) => {
        if (!prev) return prev;
        const here = (m: Meal) => m.weekStart === week && m.day === day && m.slot === slot;
        if (id === null) {
          const meal = prev.meals.find(here);
          return {
            ...prev,
            meals: prev.meals.filter((m) => !here(m)),
            ingredients: meal
              ? prev.ingredients.filter((i) => i.mealId !== meal.id)
              : prev.ingredients,
          };
        }
        return {
          ...prev,
          meals: prev.meals.map((m) => (here(m) ? { ...m, id } : m)),
          weeks: prev.weeks.includes(week!) ? prev.weeks : [week!, ...prev.weeks],
        };
      });
    });
  }

  /**
   * Marque (ou démarque) un créneau comme « restes » d'un autre repas.
   * On recharge ensuite : le serveur a pu supprimer des ingrédients devenus
   * inutiles, et le titre affiché vient désormais du repas source.
   */
  async function setLeftover(day: number, slot: SlotId, leftoverOf: number | null) {
    if (!week) return;
    flush();
    const res = await send("/api/meals", {
      method: "PUT",
      body: JSON.stringify({ weekStart: week, day, slot, leftoverOf }),
    });
    if (res) await load(week, true);
  }

  /** Enregistre (ou retire, avec une chaîne vide) le lien de recette. */
  async function saveLink(day: number, slot: SlotId, link: string) {
    if (!week) return;
    flush();
    const res = await send("/api/meals", {
      method: "PUT",
      body: JSON.stringify({ weekStart: week, day, slot, link }),
    });
    if (!res) return false;
    setData((prev) =>
      prev
        ? {
            ...prev,
            meals: prev.meals.map((m) =>
              m.weekStart === week && m.day === day && m.slot === slot
                ? { ...m, link: String(res.link ?? "") }
                : m,
            ),
          }
        : prev,
    );
    return true;
  }

  async function addIngredient(
    mealId: number | null,
    weekStart: string,
    name: string,
    qty: string,
  ) {
    const res = await send("/api/ingredients", {
      method: "POST",
      body: JSON.stringify({ mealId, weekStart, name, qty }),
    });
    if (!res) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            // En tête, comme le fera le serveur : la ligne apparaît juste
            // sous le champ de saisie, là où l'œil est déjà.
            ingredients: [
              { id: res.id as number, weekStart, mealId, name: name.trim(), qty: qty.trim() },
              ...prev.ingredients,
            ],
          }
        : prev,
    );
  }

  function editIngredient(id: number, name: string, qty: string) {
    setData((prev) =>
      prev
        ? { ...prev, ingredients: prev.ingredients.map((i) => (i.id === id ? { ...i, name, qty } : i)) }
        : prev,
    );
    if (!name.trim()) return; // un nom vidé n'est pas enregistré : on supprime avec la croix
    schedule(`ing:${id}`, () => {
      void send("/api/ingredients", { method: "PATCH", body: JSON.stringify({ id, name, qty }) });
    });
  }

  async function deleteIngredient(id: number) {
    setData((prev) =>
      prev ? { ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) } : prev,
    );
    await send(`/api/ingredients?id=${id}`, { method: "DELETE" });
  }

  async function savePrefs(patch: Partial<Prefs>) {
    setData((prev) => (prev ? { ...prev, prefs: { ...prev.prefs, ...patch } } : prev));
    await send("/api/prefs", { method: "PUT", body: JSON.stringify(patch) });
  }

  /* ------------------------------------------------- vues sur les données */

  /** Repas de la semaine affichée dans le Menu. */
  const weekMeals = useMemo(
    () => (data ? data.meals.filter((m) => m.weekStart === data.weekStart) : []),
    [data],
  );

  /**
   * Semaine en cours et semaines suivantes : c'est le périmètre des onglets
   * Ingrédients et Courses, qu'importe la semaine ouverte dans le Menu.
   */
  const aheadMeals = useMemo(
    () => (data ? data.meals.filter((m) => m.weekStart >= data.from) : []),
    [data],
  );
  const aheadIngredients = useMemo(
    () => (data ? data.ingredients.filter((i) => i.weekStart >= data.from) : []),
    [data],
  );

  /** Repas réellement cuisinés cette semaine : seules sources de restes. */
  const leftoverSources = useMemo(
    () =>
      weekMeals
        .filter((m) => m.id > 0 && m.leftoverOf === null && m.title.trim())
        .sort((a, b) => a.day - b.day || (a.slot === "midi" ? -1 : 1)),
    [weekMeals],
  );

  const groups = useMemo(
    () => (data ? buildList(aheadMeals, aheadIngredients, data.prefs) : []),
    [data, aheadMeals, aheadIngredients],
  );

  const remaining = useMemo(
    () => groups.flatMap((g) => g.items).filter((i) => !checked[i.key]).length,
    [groups, checked],
  );

  async function resync() {
    if (!week) return;
    setSyncing(true);
    flush();
    await flushChecks(); // ce qui traîne part d'abord, sinon on l'effacerait
    const fresh = await load(week, true);
    if (fresh) {
      const items = new Map(
        buildList(
          fresh.meals.filter((m) => m.weekStart >= fresh.from),
          fresh.ingredients.filter((i) => i.weekStart >= fresh.from),
          fresh.prefs,
        )
          .flatMap((g) => g.items)
          .map((i) => [i.key, i]),
      );
      // La base fait foi : elle contient aussi ce que l'autre a coché.
      const next: CheckedMap = {};
      for (const [key, totals] of Object.entries(fresh.checks ?? {})) {
        const item = items.get(key);
        if (!item) continue; // l'item a quitté la liste
        if (quantityIncreased(totals, item.totals)) continue; // quantité en hausse : à reprendre
        next[key] = item.totals;
      }
      pendingChecks.current.clear();
      rememberPending();
      writeChecked(next);
      // On renvoie le résultat : les deux téléphones repartent d'accord, et
      // les articles disparus de la liste quittent la base au passage.
      await send("/api/checks", {
        method: "PUT",
        body: JSON.stringify({ entries: next, week: fresh.from }),
      });
    }
    setSyncing(false);
  }

  /* -------------------------------------------------------- rendu ---- */

  const order = resolveOrder(data?.prefs.categoryOrder);
  const when = week ? weekWhen(week, horizon.current || undefined) : "cours";

  function moveCategory(index: number, delta: number) {
    setOrderDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // La semaine est déjà écrite dans le sélecteur juste à côté : le sous-titre
  // du menu dit plutôt quoi faire de la page.
  const heading: Record<Tab, { title: string; sub: string }> = {
    menu: { title: "Menu", sub: "Un plat pour le midi, un pour le soir" },
    ingredients: {
      title: "Ingrédients",
      sub: "Cette semaine et les suivantes",
    },
    courses: {
      title: "Liste de courses",
      sub:
        remaining > 0
          ? `${remaining} article${remaining > 1 ? "s" : ""} encore à prendre`
          : "Tout ce qu'il faut acheter dès maintenant",
    },
  };

  return (
    <div className="app" data-tab={tab}>
      <aside className="side">
        <div className="brand">
          <Illustration name="marmite" size={40} />
          <span>
            Courses
            <small>menu &amp; liste</small>
          </span>
        </div>
        <nav className="side-nav">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={21} />
              <span>
                {t.label}
                <small>{t.hint}</small>
              </span>
              {t.id === "courses" && remaining > 0 && <b className="count">{remaining}</b>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <Illustration name="etal" size={132} className="side-art" />
          <button className="side-more" onClick={() => setSheet("reglages")}>
            <Icon name="points" size={19} />
            Réglages
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="page-head">
          <div className="page-title">
            <h1>{heading[tab].title}</h1>
            <p>{heading[tab].sub}</p>
          </div>

          {tab === "menu" && (
            <div className="week-nav">
              <button
                className="icon-btn"
                aria-label="Semaine précédente"
                onClick={() => week && setWeek(addWeeks(week, -1))}
              >
                <Icon name="precedent" size={20} />
              </button>
              <span className="week-label">
                {week ? weekLabel(week) : "…"}
                <small>
                  {when === "cours"
                    ? "semaine en cours"
                    : when === "venir"
                      ? "semaine à venir"
                      : "semaine passée"}
                </small>
              </span>
              <button
                className="icon-btn"
                aria-label="Semaine suivante"
                onClick={() => week && setWeek(addWeeks(week, 1))}
              >
                <Icon name="suivant" size={20} />
              </button>
            </div>
          )}

          <button
            className="icon-btn head-more"
            aria-label="Réglages"
            onClick={() => setSheet("reglages")}
          >
            <Icon name="points" size={20} />
          </button>
        </header>

        {busy > 0 && <div className="saving">Enregistrement…</div>}

        <main className="page-body">
          {error && (
            <div className="error">
              {error}
              <button className="btn link" onClick={() => week && load(week)}>
                Réessayer
              </button>
            </div>
          )}

          {loading && !data ? (
            <div className="loading">Chargement…</div>
          ) : !data ? null : tab === "menu" ? (
            <MenuTab
              weekStart={data.weekStart}
              meals={weekMeals}
              onTitleChange={changeTitle}
              onPickLeftover={(day, slot) => {
                flush();
                setLeftoverTarget({ day, slot });
              }}
              onClearLeftover={(day, slot) => void setLeftover(day, slot, null)}
              canUseLeftovers={leftoverSources.length > 0}
              peers={peers}
              onEditLink={(day, slot) => {
                flush();
                setLinkTarget({ day, slot });
              }}
              onFocusCell={(cell) => {
                focusedMeal.current = cell ? `${data.weekStart}:${cell.day}:${cell.slot}` : null;
                // Signale tout de suite où l'on est, sans attendre le battement.
                void ping.current?.();
              }}
            />
          ) : tab === "ingredients" ? (
            <IngredientsTab
              from={data.from}
              meals={aheadMeals.filter((m) => m.id > 0)}
              ingredients={aheadIngredients}
              onAdd={addIngredient}
              onEdit={editIngredient}
              onDelete={deleteIngredient}
              onFocusIngredient={(id) => {
                focusedIngredient.current = id;
              }}
              onGoToMenu={() => setTab("menu")}
            />
          ) : (
            <ListTab
              groups={groups}
              checked={checked}
              syncing={syncing}
              sync={checkSync}
              onToggle={(item) => toggleCheck(item.key, item.totals)}
              onResync={resync}
              onReset={() => void resetChecks()}
              onChangeCategory={(key, category) =>
                void savePrefs({
                  overrides: { ...(data?.prefs.overrides ?? {}), [key]: category },
                })
              }
              onGoToIngredients={() => setTab("ingredients")}
            />
          )}
        </main>
      </div>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={22} />
            {t.id === "courses" && remaining > 0 && <span className="count">{remaining}</span>}
            {t.label}
          </button>
        ))}
      </nav>

      {sheet === "reglages" && (
        <Sheet
          title="Réglages"
          subtitle={
            tab === "menu"
              ? "L'ordre des rayons, et ce qu'on fait de la semaine ouverte."
              : "L'ordre des rayons, et les semaines déjà enregistrées."
          }
          onClose={() => setSheet(null)}
        >
          <button
            className="sheet-row"
            onClick={() => {
              setOrderDraft(order.slice());
              setSheet("order");
            }}
          >
            <Icon name="trier" size={21} />
            <span className="grow">Ordre des rayons</span>
            <Icon name="suivant" size={17} />
          </button>

          {tab === "menu" && week && (
            <>
              <p className="sub">Semaine du menu — {weekLabel(week)}</p>
              {when !== "cours" && (
                <button
                  className="sheet-row"
                  onClick={() => {
                    setWeek(horizon.current || currentWeekStart());
                    setSheet(null);
                  }}
                >
                  <Icon name="calendrier" size={21} />
                  <span className="grow">Revenir à la semaine en cours</span>
                </button>
              )}
              <button
                className="sheet-row"
                onClick={async () => {
                  const next = addWeeks(week, 1);
                  setSheet(null);
                  const res = await send("/api/weeks", {
                    method: "POST",
                    body: JSON.stringify({ weekStart: next, copyFrom: week }),
                  });
                  if (res) setWeek(next);
                }}
              >
                <Icon name="copier" size={21} />
                <span className="grow">Copier ce menu sur la semaine suivante</span>
              </button>
              <button
                className="sheet-row danger"
                onClick={async () => {
                  if (!window.confirm("Effacer tous les repas et ingrédients de cette semaine ?"))
                    return;
                  setSheet(null);
                  const res = await send(`/api/weeks?week=${week}`, { method: "DELETE" });
                  if (res) await load(week, true);
                }}
              >
                <Icon name="poubelle" size={21} />
                <span className="grow">Vider cette semaine</span>
              </button>
            </>
          )}

          {(data?.weeks ?? []).filter((w) => w !== week).length > 0 && (
            <>
              <p className="sub">Semaines enregistrées</p>
              {(data?.weeks ?? [])
                .filter((w) => w !== week)
                .slice(0, 12)
                .map((w) => (
                  <button
                    key={w}
                    className="sheet-row"
                    onClick={() => {
                      setWeek(w);
                      setTab("menu");
                      setSheet(null);
                    }}
                  >
                    <Icon name="calendrier" size={21} />
                    <span className="grow">{weekLabel(w)}</span>
                    <span className="aside">
                      {weekWhen(w, horizon.current || undefined) === "venir" ? "à venir" : "passée"}
                    </span>
                  </button>
                ))}
            </>
          )}
        </Sheet>
      )}

      {leftoverTarget && (
        <Sheet
          title="Restes de quel repas ?"
          subtitle={`${DAYS[leftoverTarget.day]} ${
            SLOTS.find((s) => s.id === leftoverTarget.slot)?.label.toLowerCase()
          } — rien ne sera ajouté à la liste de courses.`}
          onClose={() => setLeftoverTarget(null)}
        >
          {leftoverSources.map((meal) => (
            <button
              key={meal.id}
              className="sheet-row"
              onClick={() => {
                const target = leftoverTarget;
                setLeftoverTarget(null);
                void setLeftover(target.day, target.slot, meal.id);
              }}
            >
              <Icon name="restes" size={21} />
              <span className="grow">{meal.title}</span>
              <span className="aside">
                {DAYS[meal.day].toLowerCase()}{" "}
                {SLOTS.find((s) => s.id === meal.slot)?.label.toLowerCase()}
              </span>
            </button>
          ))}
        </Sheet>
      )}

      {linkTarget && data && (
        <LinkSheet
          meal={
            weekMeals.find((m) => m.day === linkTarget.day && m.slot === linkTarget.slot) ?? null
          }
          onClose={() => setLinkTarget(null)}
          onSave={async (value) => {
            const target = linkTarget;
            const ok = await saveLink(target.day, target.slot, value);
            if (ok) setLinkTarget(null);
          }}
        />
      )}

      {sheet === "order" && (
        <Sheet
          title="Ordre des rayons"
          subtitle="Range-les dans l'ordre où tu traverses ton magasin."
          onClose={() => setSheet(null)}
        >
          {orderDraft.map((id, index) => (
            <div className="sheet-row" key={id}>
              <Icon name={categoryIcon(id)} size={21} />
              <span className="grow">{categoryLabel(id)}</span>
              <button
                className="icon-btn"
                aria-label={`Monter ${categoryLabel(id)}`}
                disabled={index === 0}
                onClick={() => moveCategory(index, -1)}
              >
                <Icon name="suivant" size={18} className="rot-up" />
              </button>
              <button
                className="icon-btn"
                aria-label={`Descendre ${categoryLabel(id)}`}
                disabled={index === orderDraft.length - 1}
                onClick={() => moveCategory(index, 1)}
              >
                <Icon name="suivant" size={18} className="rot-down" />
              </button>
            </div>
          ))}
          <div className="sheet-pad">
            <button
              className="btn primary"
              onClick={async () => {
                await savePrefs({ categoryOrder: orderDraft });
                setSheet(null);
              }}
            >
              Enregistrer l’ordre
            </button>
            <button className="btn" onClick={() => setOrderDraft(CATEGORIES.map((c) => c.id))}>
              Revenir à l’ordre par défaut
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Panneau de saisie du lien de recette d'un repas. */
function LinkSheet({
  meal,
  onClose,
  onSave,
}: {
  meal: Meal | null;
  onClose: () => void;
  onSave: (link: string) => Promise<void>;
}) {
  const [value, setValue] = useState(meal?.link ?? "");
  const [busy, setBusy] = useState(false);
  const current = meal?.link ?? "";

  return (
    <Sheet
      title={meal?.title || "Lien de la recette"}
      subtitle="Colle l’adresse de la vidéo ou de la page de la recette."
      onClose={onClose}
    >
      <div className="sheet-pad">
        {current && (
          <a className="btn" href={current} target="_blank" rel="noopener noreferrer">
            <Icon name="lien" size={18} />
            Ouvrir la recette ({linkHost(current)})
          </a>
        )}
        <input
          className="link-input"
          type="url"
          inputMode="url"
          value={value}
          placeholder="https://www.instagram.com/reel/…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Adresse de la recette"
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="btn primary"
          disabled={busy || normalizeLink(value) === null}
          onClick={async () => {
            setBusy(true);
            await onSave(value);
            setBusy(false);
          }}
        >
          {busy ? "Enregistrement…" : "Enregistrer le lien"}
        </button>
        {value.trim() !== "" && normalizeLink(value) === null && (
          <p className="note">
            Cette adresse n’a pas l’air valide. Elle doit ressembler à
            « instagram.com/reel/… » ou « youtube.com/watch?v=… ».
          </p>
        )}
        {current && (
          <button className="btn danger" disabled={busy} onClick={async () => {
            setBusy(true);
            await onSave("");
            setBusy(false);
          }}>
            Retirer le lien
          </button>
        )}
      </div>
    </Sheet>
  );
}
