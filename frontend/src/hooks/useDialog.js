/* ==========================================================================
   useDialog — the keyboard and focus rules every dialog follows (Modal,
   the menu's ProductSheet): focus moves inside on open and returns to the
   trigger on close, Tab stays inside, Escape closes, and the page behind
   doesn't scroll.
   ========================================================================== */
import { useEffect, useRef } from "react";

export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDialog(open, panelRef, onClose) {
  // Latest onClose without re-running the effect: parents usually pass a new
  // arrow function on every render, which would move the focus on each keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector(FOCUSABLE);
    (first || panelRef.current)?.focus();

    function onKey(event) {
      if (event.key === "Escape") { event.stopPropagation(); onCloseRef.current?.(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) return;
      const [firstNode, lastNode] = [nodes[0], nodes[nodes.length - 1]];
      if (event.shiftKey && document.activeElement === firstNode) { event.preventDefault(); lastNode.focus(); }
      else if (!event.shiftKey && document.activeElement === lastNode) { event.preventDefault(); firstNode.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, panelRef]);
}
