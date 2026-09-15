"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export function NavigationHeroFit(){
 const path=usePathname();
 useEffect(()=>{
  const copies=Array.from(document.querySelectorAll<HTMLElement>("[data-nav-hero-copy]"));
  let frame=0;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>copies.forEach(copy=>{
   const hero=copy.closest<HTMLElement>("[data-nav-hero]");if(!hero)return;
   if(["columns","flow"].includes(hero.getAttribute("data-nav-hero-centered")||""))return;
   const centered=hero.hasAttribute("data-nav-hero-centered");
   const height=Math.ceil(centered?copy.getBoundingClientRect().height+80:copy.getBoundingClientRect().bottom-hero.getBoundingClientRect().top+40);
   const value=`${height}px`;if(hero.style.getPropertyValue("--nav-fit-height")!==value)hero.style.setProperty("--nav-fit-height",value);
  }));};
  const observer=new ResizeObserver(measure);copies.forEach(c=>observer.observe(c));
  window.addEventListener("resize",measure);measure();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("resize",measure);};
 },[path]);return null;
}
