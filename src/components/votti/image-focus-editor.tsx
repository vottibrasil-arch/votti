import { useEffect, useRef, useState } from "react";
import type { ImageFocus } from "@/lib/votti/crop-image";

type ImageFocusEditorProps = {
  previewUrl: string;
  variant: "circle" | "landscape";
  title?: string;
  onConfirm: (focus: ImageFocus) => void;
  onCancel: () => void;
};

export function ImageFocusEditor({
  previewUrl,
  variant,
  title = "Ajustar foto",
  onConfirm,
  onCancel,
}: ImageFocusEditorProps) {
  const [focus, setFocus] = useState<ImageFocus>({ x: 0.5, y: 0.5 });
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setFocus({ x: 0.5, y: 0.5 });
  }, [previewUrl]);

  function moveFocus(dx: number, dy: number) {
    setFocus((current) => ({
      x: Math.min(1, Math.max(0, current.x - dx * 0.0035)),
      y: Math.min(1, Math.max(0, current.y - dy * 0.0035)),
    }));
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = event.clientX - lastPoint.current.x;
    const dy = event.clientY - lastPoint.current.y;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    moveFocus(dx, dy);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="votti-focus-editor" role="dialog" aria-modal="true" aria-label={title}>
      <div className="votti-focus-editor__backdrop" onClick={onCancel} aria-hidden />
      <div className="votti-focus-editor__panel animate-rise">
        <h3 className="votti-focus-editor__title">{title}</h3>
        <p className="votti-focus-editor__hint">Arraste a foto para escolher o que aparece.</p>

        <div
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
