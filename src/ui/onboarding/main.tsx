import { createRoot } from "react-dom/client";
import "@ui/styles/globals.css";
import { OnboardingApp } from "./OnboardingApp";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<OnboardingApp />);
}
