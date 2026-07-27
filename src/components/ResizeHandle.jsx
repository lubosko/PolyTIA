import { useRef, useCallback } from 'react';

/**
 * Vertical drag handle between panels.
 * Calls onResize(deltaX) continuously while dragging — parent clamps and applies.
 */
export default function ResizeHandle({ onResize }) {
  const dragState = useRef(null);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      dragState.current.startX = ev.clientX;
      onResize(delta);
    }
    function onUp() {
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onResize]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-border/40 hover:bg-accent/60 transition-colors"
      title="Drag to resize"
    />
  );
}
