import { useState } from "react";

interface Step {
  title: string;
  description: string;
  visual: React.ReactNode;
}

const steps: Step[] = [
  {
    title: "Your tabs, organized as a tree",
    description:
      "Canopy displays your browser tabs in a tree hierarchy. Child tabs are nested under their parents, so you can see how your browsing flows. Collapse branches to focus on what matters.",
    visual: (
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-[13px] font-mono">
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)]">
          <span className="text-[10px]">▼</span>
          <span className="w-3 h-3 rounded-sm bg-blue-400 shrink-0" />
          <span>Research Project</span>
        </div>
        <div className="ml-6 flex items-center gap-2 py-1 text-[var(--color-fg)]">
          <span className="w-1 opacity-0">▶</span>
          <span className="w-3 h-3 rounded-sm bg-green-400 shrink-0" />
          <span>Wikipedia — Machine Learning</span>
        </div>
        <div className="ml-6 flex items-center gap-2 py-1 text-[var(--color-fg)]">
          <span className="text-[10px]">▼</span>
          <span className="w-3 h-3 rounded-sm bg-orange-400 shrink-0" />
          <span>Stack Overflow — Python</span>
        </div>
        <div className="ml-12 flex items-center gap-2 py-1 text-[var(--color-fg)] opacity-70">
          <span className="w-1 opacity-0">▶</span>
          <span className="w-3 h-3 rounded-sm bg-gray-400 shrink-0" />
          <span>NumPy Documentation</span>
        </div>
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)]">
          <span className="text-[10px]">▶</span>
          <span className="w-3 h-3 rounded-sm bg-purple-400 shrink-0" />
          <span className="flex items-center gap-1">
            Email <span className="text-[10px] text-[var(--color-muted)] px-1 bg-[var(--color-hover)] rounded">3</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Save and restore sessions",
    description:
      "Save your entire tab tree as a named session. Restore it later — either replacing your current tabs or adding alongside them. Export sessions as JSON files to share or back up.",
    visual: (
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-[13px]">
        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
          <span className="font-medium text-[var(--color-fg)]">Saved Sessions</span>
        </div>
        <div className="mt-2 space-y-2">
          {["Work Research — 12 tabs", "Shopping List — 5 tabs", "Project Alpha — 23 tabs"].map((name) => (
            <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded bg-[var(--color-hover)]">
              <span className="text-[var(--color-fg)]">{name}</span>
              <div className="flex gap-1">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Restore</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-border)] text-[var(--color-muted)]">Export</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Copy context for AI",
    description:
      'Click the "Copy context for AI" button to export your tab tree as structured markdown — perfect for pasting into ChatGPT, Claude, or any AI assistant. It includes URLs, titles, and the full hierarchy.',
    visual: (
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-[12px] font-mono text-[var(--color-fg)]">
        <div className="text-[var(--color-muted)] mb-2"># Browsing Context</div>
        <div>
          <div>{"▸ Research Project"}</div>
          <div className="ml-4">{"• Wikipedia — Machine Learning"}</div>
          <div className="ml-4">{"▸ Stack Overflow — Python"}</div>
          <div className="ml-8">{"• NumPy Documentation"}</div>
          <div>{"• Email (3 collapsed)"}</div>
        </div>
        <div className="mt-3 text-[var(--color-muted)]">{"// Each entry includes the full URL"}</div>
      </div>
    ),
  },
  {
    title: "Spot stale tabs at a glance",
    description:
      "Tabs you haven't visited in a while automatically dim — warm after 6 hours, stale after a day, decayed after 3 days. Quickly identify tabs you've forgotten about and close what you don't need.",
    visual: (
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-[13px] space-y-1.5">
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)]">
          <span className="w-3 h-3 rounded-sm bg-blue-400 shrink-0" />
          <span>Active tab — just visited</span>
        </div>
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)] opacity-80">
          <span className="w-3 h-3 rounded-sm bg-gray-400 shrink-0" />
          <span>Warm — visited 6+ hours ago</span>
        </div>
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)] opacity-60">
          <span className="w-3 h-3 rounded-sm bg-gray-400 shrink-0" />
          <span className="flex items-center gap-1">Stale — 1+ day ago <span className="text-yellow-500 text-[10px]">⏳</span></span>
        </div>
        <div className="flex items-center gap-2 py-1 text-[var(--color-fg)] opacity-40">
          <span className="w-3 h-3 rounded-sm bg-gray-400 shrink-0" />
          <span className="flex items-center gap-1">Decayed — 3+ days ago <span className="text-orange-400 text-[10px]">💤</span></span>
        </div>
      </div>
    ),
  },
  {
    title: "You're all set!",
    description:
      "Click the Canopy icon in your toolbar or press Alt+S to open the side panel. Right-click any tab for more options like Close Tree, Copy URL, or Copy Context for AI.",
    visual: (
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 text-[13px] space-y-3">
        <div className="text-[var(--color-fg)] font-medium">Keyboard shortcuts</div>
        <div className="space-y-2">
          {[
            ["Alt + S", "Open/close side panel"],
            ["↑ ↓", "Navigate tabs"],
            ["← →", "Collapse/expand or jump to parent"],
            ["Enter", "Activate selected tab"],
            ["Delete", "Close selected tab"],
            ["Shift + Click", "Range select"],
            ["Ctrl/⌘ + Click", "Toggle select"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-hover)] border border-[var(--color-border)] text-[var(--color-fg)] font-mono min-w-[80px] text-center">
                {key}
              </kbd>
              <span className="text-[var(--color-muted)]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function OnboardingApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Open side panel and close this tab
      chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" }).catch(() => {});
      window.close();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" }).catch(() => {});
    window.close();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex items-center justify-center p-8">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/public/images/icon-128.png" alt="Canopy" className="w-12 h-12" />
            <h1 className="text-2xl font-semibold">Canopy</h1>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-8 bg-green-500" : i < currentStep ? "w-1.5 bg-green-500/50" : "w-1.5 bg-[var(--color-border)]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-3 text-center">{step.title}</h2>
          <p className="text-[var(--color-muted)] text-center mb-6 leading-relaxed">
            {step.description}
          </p>
          <div className="max-w-md mx-auto">{step.visual}</div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors bg-transparent border-none cursor-pointer"
          >
            Skip
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-4 py-2 text-[13px] rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 text-[13px] rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer border-none font-medium"
            >
              {isLast ? "Open Canopy" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
