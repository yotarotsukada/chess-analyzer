import type { Opening, OpeningLookup } from "../../app/domain/review";
import { JA_FAMILY_NAMES } from "./ja";
import data from "./openings.json";

const table = data as unknown as Record<string, [string, string]>;

/** 英語名の先頭（":" の前）を日本語にする。辞書にないものは英語のまま。 */
export function localizeOpeningName(name: string): string {
  const [family, ...rest] = name.split(":");
  const ja = JA_FAMILY_NAMES[family.trim()];
  if (!ja) return name;
  return rest.length ? `${ja}:${rest.join(":")}` : ja;
}

export const lookupOpening: OpeningLookup = (epd) => {
  const hit = table[epd];
  if (!hit) return null;
  const opening: Opening = { eco: hit[0], name: localizeOpeningName(hit[1]) };
  return opening;
};
