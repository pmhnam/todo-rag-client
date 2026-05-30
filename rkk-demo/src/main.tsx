import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./i18n"; // Initialize i18n
import "./main.scss";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";

const googleClientId =
  window.__RKK_DEMO_CONFIG__?.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID;

const app = (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

createRoot(document.getElementById("root")!).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
  ) : (
    app
  ),
);
