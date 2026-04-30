import { useEffect, useState } from "react";
import { translations, type TranslationLanguage } from "@/lib/translations";

export type SupportedLanguage = TranslationLanguage;

export const languageOptions: Array<{ value: SupportedLanguage; label: string; locale: string }> = [
  { value: "en", label: translations.en.english, locale: "en-US" },
  { value: "hi", label: "हिन्दी", locale: "hi-IN" },
  { value: "mr", label: "मराठी", locale: "mr-IN" },
];

const LANGUAGE_STORAGE_KEY = "appLanguage";

export function getLanguageCopy(language: SupportedLanguage) {
  return translations[language] ?? translations.en;
}

export function getSpeechLocale(language: SupportedLanguage) {
  return languageOptions.find((option) => option.value === language)?.locale ?? "en-US";
}

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
  return stored || "en";
}

export function setStoredLanguage(language: SupportedLanguage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.dispatchEvent(new CustomEvent("app-language-change", { detail: language }));
}

export function useLanguage() {
  const [language, setLanguage] = useState<SupportedLanguage>(getStoredLanguage());

  useEffect(() => {
    const syncLanguage = (event?: Event) => {
      const customEvent = event as CustomEvent<SupportedLanguage> | undefined;
      setLanguage(customEvent?.detail || getStoredLanguage());
    };

    window.addEventListener("app-language-change", syncLanguage);
    window.addEventListener("storage", syncLanguage);
    return () => {
      window.removeEventListener("app-language-change", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  return {
    language,
    copy: getLanguageCopy(language),
    setLanguage: setStoredLanguage,
  };
}

export const useAppLanguage = useLanguage;
