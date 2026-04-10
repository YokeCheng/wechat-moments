import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { resolveCurrentUser, type CurrentUser } from "@/lib/auth";


const navLinks = [
  { label: "Daily Hot", path: "/" },
  { label: "Prompt Library", path: "/prompts" },
  { label: "AI Writer", path: "/writer" },
  { label: "Layout", path: "/layout" },
  { label: "Channels", path: "/channels" },
  { label: "Tutorial", path: "/tutorial" },
  { label: "Contact", path: "/contact" },
  { label: "VIP", path: "/vip" },
];

const userMenuItems = ["Profile", "Favorites", "Settings", "Sign out"];

type TopBarProps = {
  title?: string;
  subtitle?: string;
};

const TopBar = (_props: TopBarProps) => {
  const navigate = useNavigate();
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

  const userLabel = currentUser?.display_name || "Creator";
  const userInitial = userLabel.slice(0, 1).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-gray-100 flex items-center z-30 px-4 gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 flex items-center justify-center">
          <img
            src="https://public.readdy.ai/ai/img_res/89350f87-bb6b-4d30-ba8c-e1a0dae6a3f6.png"
            alt="Baoleme"
            className="w-7 h-7 object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Baoleme</p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Content intelligence workspace
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-0.5 flex-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/"}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-orange-500 font-semibold bg-orange-50"
                  : "text-gray-600 hover:text-orange-500 hover:bg-orange-50"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate("/writer")}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-edit-line text-sm" />
          </div>
          AI Writer
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUser((value) => !value)}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-100 text-orange-500 font-bold text-sm">
              {userInitial}
            </div>
            <span className="text-sm text-gray-700">{userLabel}</span>
            <div className="w-3 h-3 flex items-center justify-center">
              <i className="ri-arrow-down-s-line text-gray-400 text-xs" />
            </div>
          </button>
          {showUser && (
            <div className="absolute right-0 top-10 w-40 bg-white rounded-xl border border-gray-100 overflow-hidden z-50">
              {userMenuItems.map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer"
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
