import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../Toast";
import { Settings, LogOut, UserCircle, LogIn, Moon, Sun } from "lucide-react";

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    showToast("Logged out successfully", "success");
    navigate("/login", { replace: true });
  };

  const initials = user
    ? (user.username || user.email)
        .split(/[\s@]/)
        .map((s) => s[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("")
    : "";

  return (
    <header className="rkk-demo-header">
      <div className="rkk-demo-header-content">
        <div className="rkk-demo-header-left">
          <Link to="/" className="rkk-demo-header-logo">
            <div className="rkk-demo-logo">
              <div className="rkk-demo-logo-icon">RKK</div>
              <div className="rkk-demo-logo-text">
                <span className="rkk-demo-logo-title">{t("header.title")}</span>
                <span className="rkk-demo-logo-subtitle">
                  {t("header.subtitle")}
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="rkk-demo-header-right">
          <nav className="rkk-demo-header-nav">
            <button
              className="rkk-demo-header-nav-item"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              className="rkk-demo-header-nav-item"
              title={t("header.settings")}
            >
              <Settings size={20} />
            </button>

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="rkk-header-user" ref={dropdownRef}>
                <button
                  className="rkk-header-avatar"
                  onClick={() => setShowDropdown(!showDropdown)}
                  title={user?.email}
                >
                  {user?.image ? (
                    <img src={user.image} alt="" className="rkk-header-avatar-img" />
                  ) : (
                    <span className="rkk-header-avatar-initials">{initials}</span>
                  )}
                </button>

                {showDropdown && (
                  <div className="rkk-header-dropdown">
                    <div className="rkk-header-dropdown-info">
                      <strong>{user?.username || "User"}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <div className="rkk-header-dropdown-divider" />
                    <Link
                      to="/profile"
                      className="rkk-header-dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <UserCircle size={16} />
                      Profile
                    </Link>
                    <button
                      className="rkk-header-dropdown-item rkk-header-dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="rkk-header-signin">
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
