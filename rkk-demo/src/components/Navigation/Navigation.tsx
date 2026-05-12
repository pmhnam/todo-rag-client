import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import {
  Kanban,
  Layers,
  GitBranch,
  ScrollText,
  LayoutDashboard,
  MessageSquare,
  UserCircle,
} from "lucide-react";

const demoNavigationItems = [
  {
    path: "/",
    labelKey: "navigation.overview",
    icon: Kanban,
    descriptionKey: "navigation.overviewDescription",
  },
  {
    path: "/trello",
    labelKey: "navigation.trelloStyle",
    icon: Layers,
    descriptionKey: "navigation.trelloDescription",
  },
  {
    path: "/clickup",
    labelKey: "navigation.clickupStyle",
    icon: GitBranch,
    descriptionKey: "navigation.clickupDescription",
  },
  {
    path: "/infinite-scroll",
    labelKey: "navigation.infiniteScroll",
    icon: ScrollText,
    descriptionKey: "navigation.infiniteScrollDescription",
  },
];

const workspaceNavigationItems = [
  {
    path: "/board",
    labelKey: "navigation.myBoard",
    icon: LayoutDashboard,
    descriptionKey: "navigation.myBoardDescription",
  },
  {
    path: "/chat",
    labelKey: "navigation.aiChat",
    icon: MessageSquare,
    descriptionKey: "navigation.aiChatDescription",
  },
  {
    path: "/profile",
    labelKey: "navigation.profile",
    icon: UserCircle,
    descriptionKey: "navigation.profileDescription",
  },
];

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const renderNavItems = (items: typeof demoNavigationItems) =>
    items.map((item) => {
      const IconComponent = item.icon;
      return (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `rkk-demo-navigation-item ${isActive ? "active" : ""}`
          }
          end={item.path === "/"}
        >
          <div className="rkk-demo-navigation-item-icon">
            <IconComponent size={20} />
          </div>
          <div className="rkk-demo-navigation-item-content">
            <div className="rkk-demo-navigation-item-label">
              {t(item.labelKey)}
            </div>
            <div className="rkk-demo-navigation-item-description">
              {t(item.descriptionKey)}
            </div>
          </div>
        </NavLink>
      );
    });

  return (
    <nav className="rkk-demo-navigation">
      {isAuthenticated && (
        <>
          <div className="rkk-demo-navigation-section-label">
            {t("navigation.myWorkspace")}
          </div>
          {renderNavItems(workspaceNavigationItems)}
          <div className="rkk-demo-navigation-divider" />
        </>
      )}
      {renderNavItems(demoNavigationItems)}
    </nav>
  );
};

export default Navigation;
