export type Status =
  | "Neu"
  | "Kontaktiert"
  | "Termin"
  | "Angebot"
  | "Gewonnen"
  | "Verloren";

export const STATUSES: Status[] = [
  "Neu",
  "Kontaktiert",
  "Termin",
  "Angebot",
  "Gewonnen",
  "Verloren",
];

export type Prio = "HOCH" | "MITTEL" | "NIEDRIG";

export const PRIOS: Prio[] = ["HOCH", "MITTEL", "NIEDRIG"];

export type JaNein = "Ja" | "Nein";

/** Lead row — columns A–R exactly as ordered in the source sheet. */
export interface Lead {
  datum: string; // A
  firma: string; // B
  branche: string; // C
  domain: string; // D  (Key)
  shop_system: string; // E
  telefon: string; // F
  adresse: string; // G
  google_rating: number; // H
  reviews: number; // I
  seo_score: number; // J
  money_kw_top10: JaNein; // K
  niche_kw_top10: JaNein; // L
  geo_sichtbar: JaNein; // M
  sichtbarkeit: string; // N
  baustellen: string; // O
  sales_pitch: string; // P  (renamed from "hook")
  lead_prio: Prio; // Q
  status: Status; // R
}

export interface Kpis {
  today_new: number;
  hoch_open: number;
  termine: number;
  pipeline_value_eur: number; // Termine × 9.999 (placeholder)
}
