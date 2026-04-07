import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline tile caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.info("[SW] Registered:", reg.scope))
      .catch((err) => console.warn("[SW] Registration failed:", err));
  });
}
