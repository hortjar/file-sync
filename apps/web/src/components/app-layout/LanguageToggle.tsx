import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  function toggleLang() {
    void i18n.changeLanguage(i18n.language === "cs" ? "en" : "cs");
  }

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[hsl(var(--text-muted))] transition-all duration-150 hover:bg-white/[0.06] hover:text-[hsl(var(--text))]"
    >
      <Globe className="size-4 shrink-0" />
      {i18n.language === "cs" ? "English" : "Čeština"}
    </button>
  );
}
