"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";

const themeEvent = "console-theme-change";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(themeEvent, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(themeEvent, callback);
    media.removeEventListener("change", callback);
  };
};
const getTheme = () => document.documentElement.dataset.theme ?? "light";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  const dark = theme === "dark";
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("console-theme", next);
    window.dispatchEvent(new Event(themeEvent));
  }
  return <button type="button" onClick={toggle} className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.96] hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}>
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span key={dark ? "sun" : "moon"} initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }} transition={{ type: "spring", duration: 0.3, bounce: 0 }}>
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </motion.span>
    </AnimatePresence>
  </button>;
}
