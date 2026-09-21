"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Select the existing element without adding an ID/style before its page hydrates.
function elementSelector(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) return "";
    const index = Array.from(parent.children).indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }
  return current ? `body > ${parts.join(" > ")}` : "";
}

export function NavigationHeroFit() {
  const path = usePathname();
  const [fittedStyle, setFittedStyle] = useState({ path, css: "" });

  useEffect(() => {
    let frame = 0;
    let active = true;
    const observed = new Set<HTMLElement>();
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!active) return;
        const rules = new Map<string, number>();
        document.querySelectorAll<HTMLElement>("[data-nav-hero-copy]").forEach(copy => {
          if (!observed.has(copy)) { observer.observe(copy); observed.add(copy); }
          const hero = copy.closest<HTMLElement>("[data-nav-hero]");
          if (!hero || ["columns", "flow"].includes(hero.getAttribute("data-nav-hero-centered") || "")) return;
          const centered = hero.hasAttribute("data-nav-hero-centered");
          const bounds = copy.getBoundingClientRect();
          const height = Math.ceil(centered ? bounds.height + 80 : bounds.bottom - hero.getBoundingClientRect().top + 40);
          const selector = elementSelector(hero);
          if (selector) rules.set(selector, Math.max(rules.get(selector) ?? 0, height));
        });
        const css = Array.from(rules, ([selector, height]) => `${selector}{--nav-fit-height:${height}px}`).join("\n");
        setFittedStyle(previous => previous.path === path && previous.css === css ? previous : { path, css });
      });
    };
    const observer = new ResizeObserver(measure);
    // Route content may stream in after the layout has hydrated.
    const mutations = new MutationObserver(measure);
    const main = document.getElementById("main-content");
    if (main) mutations.observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [path]);

  // This element exists on both server and client; only React updates its content.
  return <style data-navigation-hero-fit>{fittedStyle.path === path ? fittedStyle.css : ""}</style>;
}
