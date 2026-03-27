import { createRoot } from "react-dom/client";
import "@ui/styles/globals.css";
import { PopupApp } from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PopupApp />);
}
