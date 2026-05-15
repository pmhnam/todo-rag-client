import React from "react";
import { useTranslation } from "react-i18next";
import { Navigation } from "../Navigation";

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <aside className="rkk-demo-sidebar">
      <div className="rkk-demo-sidebar-content">
        <div className="rkk-demo-sidebar-section">
          <h3 className="rkk-demo-sidebar-title">
            {t("navigation.myWorkspace")}
          </h3>
          <Navigation />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
