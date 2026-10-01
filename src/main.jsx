import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import StartupSplash from "./components/StartupSplash.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <StartupSplash>
        <App />
      </StartupSplash>
    </BrowserRouter>
  </StrictMode>,
);
