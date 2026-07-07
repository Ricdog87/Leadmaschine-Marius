export type Status =
  | "Neu"
  | "Kontaktiert"
  | "Nummer weitergegeben"
  | "Mail geschickt"
  | "Termin"
  | "Angebot"
  | "Gewonnen"
  | "Verloren";

export const STATUSES: Status[] = [
  "Neu",
  "Kontaktiert",
  "Nummer weitergegeben",
  "Mail geschickt",
  "Termin",
  "Angebot",
  "Gewonnen",
  "Verloren",
];

export type Prio = "HOCH" | "MITTEL" | "NIEDRIG";

export const PRIOS: Prio[] = ["HOCH", "MITTEL", "NIEDRIG"];

export type JaNein = "Ja" | "Nein";

/** Acquisition channel for a lead (sheet column T). */
export type AkquiseForm = "Anruf" | "E-Mail" | "";

/** Lead row — columns A–X as ordered in the RSG_Staging_Leads sheet tab. */
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
  // ── Strategy fields (columns S–X), added from the live sheet ──
  marge_klasse: string; // S  e.g. "Premium"
  akquise_form: AkquiseForm; // T  "Anruf" | "E-Mail"
  branche_kategorie: string; // U  e.g. "Outdoor"
  welle: string; // V  e.g. "W1" | "W2" | "W3"
  akquise_status: string; // W  e.g. "ARCHIV" | "AKTIV" | "PIPELINE"
  pipeline_potenzial: number; // X  estimated contract value in EUR
}

export interface Kpis {
  today_new: number;
  hoch_open: number;
  termine: number;
  /** Sum of pipeline_potenzial across open "Termin" leads (real sheet value). */
  pipeline_value_eur: number;
}
