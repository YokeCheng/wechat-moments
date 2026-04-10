import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { resolveCurrentUser, type CurrentUser } from "@/lib/auth";

type TopBarProps = {
  title?: string;
  subtitle?: string;
};

const TopBar = (_props: TopBarProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showUser, setShowUser] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const user = await resolveCurrentUser();
        if (active) {
          setCurrentUser(user);
        }
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const navLinks = [
    { label: t("topbar.nav.discover"), path: "/" },
    { label: t("topbar.nav.prompts"), path: "/prompts" },
    { label: t("topbar.nav.writer"), path: "/writer" },
    { label: t("topbar.nav.layout"), path: "/layout" },
    { label: t("topbar.nav.channels"), path: "/channels" },
    { label: t("topbar.nav.tutorial"), path: "/tutorial" },
    { label: t("topbar.nav.contact"), path: "/contact" },
    { label: t("topbar.nav.vip"), path: "/vip" },
  ];

  const userMenuItems = [
    t("topbar.user.profile"),
    t("topbar.user.favorites"),
    t("topbar.user.settings"),
    t("topbar.user.logout"),
  ];

  const currentLanguage: SupportedLanguage =
    (i18n.resolvedLanguage || i18n.language).toLowerCase().startsWith("en") ? "en" : "zh";
  const userLabel = currentUser?.display_name || t("topbar.user.fallback");
  const userInitial = userLabel.slice(0, 1).toUpperCase();

  const handleLanguageChange = (language: SupportedLanguage) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[52px] items-center gap-4 border-b border-gray-100 bg-white px-4">
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center">
          <img
            src="https://public.readdy.ai/ai/img_res/89350f87-bb6b-4d30-ba8c-e1a0dae6a3f6.png"
            alt="爆了么"
            className="h-7 w-7 object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">爆了么</p>
          <p className="text-[10px] leading-tight text-gray-400">{t("topbar.brand.subtitle")}</p>
        </div>
      </div>

      <nav className="flex flex-1 items-center gap-0.5">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/"}
            className={({ isActive }) =>
              `cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-orange-50 font-semibold text-orange-500"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-500"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="flex items-center rounded-full bg-gray-100 p-0.5">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language}
              onClick={() => handleLanguageChange(language)}
              className={`min-w-[44px] rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                currentLanguage === language
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(`topbar.language.${language}`)}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/writer")}
          className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <div className="flex h-4 w-4 items-center justify-center">
            <i className="ri-edit-line text-sm" />
          </div>
          {t("topbar.actions.startWriting")}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUser((value) => !value)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-500">
              {userInitial}
            </div>
            <span className="text-sm text-gray-700">{userLabel}</span>
            <div className="flex h-3 w-3 items-center justify-center">
              <i className="ri-arrow-down-s-line text-xs text-gray-400" />
            </div>
          </button>
          {showUser && (
            <div className="absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white">
              {userMenuItems.map((item) => (
                <button
                  key={item}
                  className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-500"
                  onClick={() => setShowUser(false)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
