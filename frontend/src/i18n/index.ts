import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import messages from "./local/index";

export const LANGUAGE_STORAGE_KEY = "wm_language";
export const SUPPORTED_LANGUAGES = ["zh", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "zh";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "en" ? "en" : "zh";
}

i18n
  .use(initReactI18next)
  .init({
    lng: resolveInitialLanguage(),
    fallbackLng: "zh",
    supportedLngs: SUPPORTED_LANGUAGES,
    debug: false,
    resources: messages,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
