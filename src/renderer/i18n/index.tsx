import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import en from "./locales/en";
import zh from "./locales/zh";

type Locale = "en" | "zh";

type Dict = typeof en;

const DICTS: Record<Locale, Dict> = { en, zh };

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function interpolate(str: string, params?: Record<string, any>) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
}

export interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, any>) => string;
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
    return (key: string, params?: Record<string, any>) => {
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

export function t(key: string, params?: Record<string, any>) {
  // Convenience for non-hook contexts; default to English
  const val = get(en, key) ?? key;
  return interpolate(val as string, params);
}

