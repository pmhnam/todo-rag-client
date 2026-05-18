import { createRoot } from "react-dom/client";
import "./i18n"; // Initialize i18n
import "./main.scss";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
