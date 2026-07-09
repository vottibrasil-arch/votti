import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageFocus } from "@/lib/votti/crop-image";

type ImageFocusEditorProps = {
  previewUrl: string;
  variant: "circle" | "landscape";
  title?: string;
  onConfirm: (focus: ImageFocus) => void;
  onCancel: () => void;
};

function moveSensitivity() {
  return window.matchMedia("(pointer: coarse)").matches ? 0.0075 : 0.0035;
}

export function ImageFocusEditor({
  previewUrl,
  variant,
  title = "Ajustar foto",
  onConfirm,
  onCancel,
}: ImageFocusEditorProps) {
  const [focus, setFocus] = useState<ImageFocus>({ x: 0.5, y: 0.5 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setFocus({ x: 0.5, y: 0.5 });
  }, [previewUrl]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const applyMove = useCallback((dx: number, dy: number) => {
    const step = moveSensitivity();
    setFocus((current) => ({
      x: Math.min(1, Math.max(0, current.x - dx * step)),
      y: Math.min(1, Math.max(0, current.y - dy * step)),
    }));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      dragging.current = true;
      lastPoint.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    function onTouchMove(event: TouchEvent) {
      if (!dragging.current || event.touches.length !== 1) return;
      event.preventDefault();
      const touch = event.touches[0];
      const dx = touch.clientX - lastPoint.current.x;
      const dy = touch.clientY - lastPoint.current.y;
      lastPoint.current = { x: touch.clientX, y: touch.clientY };
      applyMove(dx, dy);
    }

    function endTouch() {
      dragging.current = false;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", endTouch);
    el.addEventListener("touchcancel", endTouch);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", endTouch);
      el.removeEventListener("touchcancel", endTouch);
    };
  }, [applyMove, previewUrl]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    dragging.current = true;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !dragging.current) return;
    const dx = event.clientX - lastPoint.current.x;
    const dy = event.clientY - lastPoint.current.y;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    applyMove(dx, dy);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="votti-focus-editor" role="dialog" aria-modal="true" aria-label={title}>
      <div className="votti-focus-editor__backdrop" onClick={onCancel} aria-hidden />
      <div className="votti-focus-editor__panel animate-rise">
        <h3 className="votti-focus-editor__title">{title}</h3>
        <p className="votti-focus-editor__hint">
          Arraste com o dedo ou use os controles para escolher o que aparece.
        </p>

        <div
          ref={viewportRef}
          className={`votti-focus-editor__viewport votti-focus-editor__viewport--${variant}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={previewUrl}
            alt=""
            className="votti-focus-editor__image"
            style={{ objectPosition: `${focus.x * 100}% ${focus.y * 100}%` }}
            draggable={false}
          />
        </div>

        <div className="votti-focus-editor__sliders">
          <label className="votti-focus-editor__slider">
            <span>Horizontal</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focus.x * 100)}
              onChange={(e) => setFocus((f) => ({ ...f, x: Number(e.target.value) / 100 }))}
            />
          </label>
          <label className="votti-focus-editor__slider">
            <span>Vertical</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focus.y * 100)}
              onChange={(e) => setFocus((f) => ({ ...f, y: Number(e.target.value) / 100 }))}
            />
          </label>
        </div>

        <div className="votti-focus-editor__actions">
          <button type="button" className="votti-focus-editor__btn votti-focus-editor__btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="votti-focus-editor__btn votti-focus-editor__btn--primary"
            onClick={() => onConfirm(focus)}
          >
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
