import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import en from "./locales/en";
import zh from "./locales/zh";

type Locale = "en" | "zh";

type Dict = Record<string, unknown>;

const DICTS: Record<Locale, Dict> = { en: en as unknown as Dict, zh: zh as unknown as Dict };

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(str: string, params?: Record<string, unknown>) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] as string | undefined) ?? "");
}

export interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, unknown>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // Load language from settings if available
    (async () => {
      try {
        const resp = await window.ContextBridge.settings.getSetting("language");
        if (resp.success && (resp.data === "en" || resp.data === "zh")) {
          setLocaleState(resp.data);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    // Persist to settings, fire and forget
    window.ContextBridge.settings.update({ settings: { language: loc } }).catch(() => void 0);
  };

  const dict = DICTS[locale] || en;

  const t = useMemo(() => {
    return (key: string, params?: Record<string, unknown>) => {
      const val = get(dict, key);
      if (typeof val === "string") return interpolate(val, params);
      // fallback to key for visibility when missing
      return interpolate(key, params);
    };
  }, [dict]);
  

  const value = useMemo<I18nContextValue>(() => ({ locale, t, setLocale }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function t(key: string, params?: Record<string, unknown>) {
  // Convenience for non-hook contexts; default to English
  const val = get(en, key);
  if (typeof val === "string") return interpolate(val, params);
  return interpolate(key, params);
}

