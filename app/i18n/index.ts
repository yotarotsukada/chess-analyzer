import { ja, type MessageKey } from "./ja";

export type { MessageKey };

/** 文言を取り出す。{name} の形の置き換えに対応する。 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const msg: string = ja[key];
  if (!params) return msg;
  return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
