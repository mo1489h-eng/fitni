import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar.json";
import en from "./en.json";

const savedLang = localStorage.getItem("coachbase-lang") || "ar";

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: savedLang,
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
});

// Apply direction on init and language change
const applyDirection = (lang: string) => {
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  document.body.style.direction = dir;
};

applyDirection(savedLang);

i18n.on("languageChanged", (lang) => {
  localStorage.setItem("coachbase-lang", lang);
  applyDirection(lang);
});

export default i18n;
