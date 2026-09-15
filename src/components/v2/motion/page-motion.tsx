"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { shouldInitializePageMotion } from "@/lib/motion/runtime";

export function V2PageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;
    const reviewMode = new URLSearchParams(window.location.search).get("visualReview") === "1";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.visualReview = reviewMode ? "true" : "false";

    if (!shouldInitializePageMotion({ pathname, reviewMode, reducedMotion })) {
      return () => { document.documentElement.dataset.visualReview = "false"; };
    }

    let active = true;
    let cleanupMotion = () => {};
    // Streamed page sections can hydrate after this layout client boundary.
    // Let hydration settle before GSAP writes inline styles, and only animate
    // sections that have not already entered the viewport.
    const startTimer = window.setTimeout(() => {
      if (!active) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      const context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-motion='reveal']").forEach((element) => {
          if (element.getBoundingClientRect().top > window.innerHeight * 0.86) {
            gsap.from(element, { y: 16, opacity: 0, duration: 0.48, ease: "power2.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
          }
        });
        gsap.utils.toArray<HTMLElement>("[data-motion='cascade']").forEach((group) => {
          if (group.getBoundingClientRect().top > window.innerHeight * 0.88) {
            gsap.from(Array.from(group.children), { y: 12, opacity: 0, stagger: 0.035, duration: 0.42, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 90%", once: true } });
          }
        });
        gsap.utils.toArray<HTMLElement>("[data-motion='mask-reveal']").forEach((element) => {
          if (element.getBoundingClientRect().top > window.innerHeight * 0.84) {
            gsap.from(element, { clipPath: "inset(0 22% 0 0)", opacity: .72, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
          }
        });

        media.add("(min-width: 901px)", () => {
          const pageHeroBackground = document.querySelector("[data-motion='page-hero-background']");
          const pageHero = document.querySelector(".v2-page-hero");
          if (pageHeroBackground && pageHero) {
            gsap.to(pageHeroBackground, { yPercent: 2, scale: 1.01, ease: "none", scrollTrigger: { trigger: pageHero, start: "top top", end: "bottom top", scrub: 0.8 } });
          }
          gsap.utils.toArray<HTMLElement>("[data-motion='page-parallax']").forEach((element) => {
            gsap.to(element, { yPercent: -2.5, ease: "none", scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 } });
          });
        });
      });

      cleanupMotion = () => {
        media.revert();
        context.revert();
      };
      void document.fonts?.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    }, 1200);

    return () => {
      active = false;
      window.clearTimeout(startTimer);
      cleanupMotion();
      document.documentElement.dataset.visualReview = "false";
    };
  }, [pathname]);

  return children;
}
