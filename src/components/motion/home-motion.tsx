"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { shouldInitializeHomeMotion } from "@/lib/motion/runtime";

export function HomeMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const reviewMode = new URLSearchParams(window.location.search).get("visualReview") === "1";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.visualReview = reviewMode ? "true" : "false";

    if (!shouldInitializeHomeMotion({ pathname, reviewMode, reducedMotion })) {
      return () => { document.documentElement.dataset.visualReview = "false"; };
    }

    let active = true;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from("[data-motion='hero-background']", { scale: 1.08, opacity: 0, duration: 1.1 })
        .from("[data-motion='hero-copy'] > *", { y: 30, opacity: 0, duration: 0.72, stagger: 0.09 }, "<0.18")
        .from("[data-motion='hero-posters']", { x: 54, y: 20, rotateY: -9, opacity: 0, duration: 0.9 }, "<0.08");

      gsap.utils.toArray<HTMLElement>("[data-motion='reveal']").forEach((element) => {
        gsap.from(element, {
          y: 38,
          opacity: 0,
          duration: 0.72,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 84%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-motion='reveal-card']").forEach((element) => {
        gsap.from(element, {
          y: 34,
          opacity: 0,
          duration: 0.62,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 90%", once: true },
        });
      });

    });

    void document.fonts?.ready.then(() => {
      if (active) ScrollTrigger.refresh();
    });

    return () => {
      active = false;
      context.revert();
      document.documentElement.dataset.visualReview = "false";
    };
  }, [pathname]);

  return null;
}
