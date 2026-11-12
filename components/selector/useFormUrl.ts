"use client";

import { useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/formState";
import { decodeForm, encodeForm, type DecodedForm } from "@/lib/formUrl";

/**
 * The form rides in the URL hash: a reload or a shared link opens the same
 * job. The hash is read after mount (the static page always paints the
 * default form, so hydration matches) and rewritten in place, a moment after
 * the last change, without adding history entries.
 */
export function useFormUrl(
  form: FormState,
  line: string,
  restore: (d: DecodedForm) => void,
): () => string {
  const hash = encodeForm(form, line);
  const [ready, setReady] = useState(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    // "#main" (the skip link) and other anchors are not a form: leave it alone.
    const read = () => {
      if (window.location.hash.includes("=")) restoreRef.current(decodeForm(window.location.hash));
    };
    if (window.location.hash.length > 1) read();
    setReady(true);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      if (window.location.hash.replace(/^#/, "") === hash) return;
      const { pathname, search } = window.location;
      try {
        window.history.replaceState(
          window.history.state,
          "",
          `${pathname}${search}${hash ? `#${hash}` : ""}`,
        );
      } catch {
        /* a sandboxed frame may refuse; the page works without it */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [hash, ready]);

  /** The link to this form, as of now (not waiting for the rewrite). */
  return () => {
    const { origin, pathname, search } = window.location;
    return `${origin}${pathname}${search}${hash ? `#${hash}` : ""}`;
  };
}
