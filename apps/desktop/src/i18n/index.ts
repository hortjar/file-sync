import { mergeTranslations, sharedTranslations } from "@file-sync/shared/i18n";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import cs from "./locales/cs.json";
import en from "./locales/en.json";

// App-specific translations are merged over the shared base (app values win).
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: mergeTranslations(sharedTranslations.en, en) },
      cs: { translation: mergeTranslations(sharedTranslations.cs, cs) },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

export default i18n;
