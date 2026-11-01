import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { landingContent } from "../landing/content.js";
import LandingNavbar from "../landing/LandingNavbar.jsx";
import LandingHero from "../landing/LandingHero.jsx";
import "../landing/landing.css";

const LandingSections = lazy(() => import("../landing/LandingSections.jsx"));

const LANGUAGE_KEY = "menupilot-landing-language";

function getInitialLanguage() {
  if (typeof window === "undefined") return "ar";

  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage === "ar" || savedLanguage === "en") return savedLanguage;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }

  return window.navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function updateMeta(name, content, attribute = "name") {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  const created = !element;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    element.dataset.menupilotLanding = "true";
    document.head.append(element);
  }

  const previousContent = element.getAttribute("content");
  element.setAttribute("content", content);

  return () => {
    if (created) {
      element.remove();
    } else if (previousContent !== null) {
      element.setAttribute("content", previousContent);
    } else {
      element.removeAttribute("content");
    }
  };
}

export default function Landing() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [loadSections, setLoadSections] = useState(false);
  const sectionsTriggerRef = useRef(null);
  const content = landingContent[language];

  useEffect(() => {
    const trigger = sectionsTriggerRef.current;
    if (!trigger) return undefined;

    if (!("IntersectionObserver" in window)) {
      setLoadSections(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadSections(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(trigger);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
  }, [language]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${content.hero.eyebrow} | ${content.brand}`;
    const cleanups = [
      updateMeta("description", content.hero.description),
      updateMeta("og:title", `${content.hero.eyebrow} | ${content.brand}`, "property"),
      updateMeta("og:description", content.hero.description, "property"),
      updateMeta("og:locale", language === "ar" ? "ar_AR" : "en_US", "property"),
    ];

    return () => {
      document.title = previousTitle;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [content, language]);

  function toggleLanguage() {
    setLanguage((currentLanguage) => (currentLanguage === "ar" ? "en" : "ar"));
  }

  return (
    <div
      className="mp-landing"
      dir={content.language === "ar" ? "rtl" : "ltr"}
      lang={content.language}
    >
      <div className="mp-aurora mp-aurora--one" aria-hidden="true" />
      <div className="mp-aurora mp-aurora--two" aria-hidden="true" />
      <div className="mp-grain" aria-hidden="true" />
      <LandingNavbar
        content={content}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
      <main>
        <LandingHero content={content.hero} />
        <div className="mp-sections-trigger" ref={sectionsTriggerRef}>
          {loadSections ? (
            <Suspense fallback={<div className="mp-sections-loading" aria-hidden="true" />}>
              <LandingSections content={content} language={language} />
            </Suspense>
          ) : (
            <div className="mp-sections-loading" aria-hidden="true" />
          )}
        </div>
      </main>
    </div>
  );
}
