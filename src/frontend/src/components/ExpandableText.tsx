import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { clamp2Style, clamp3Style, compactButtonStyle, overlayCardStyle} from "./CellComponents";

const ExpandableText: React.FC<{
  text: string;
  lines?: 2 | 3;
  emptyText?: string;
  textStyle?: React.CSSProperties;
}> = ({ text, lines = 2, emptyText = "—", textStyle }) => {
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const check = () => {
      setTruncated(
        el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1
      );
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, lines]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!text) {
    return <div style={textStyle}>{emptyText}</div>;
  }

  const clampStyle = lines === 3 ? clamp3Style : clamp2Style;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        ref={textRef}
        style={{
          ...clampStyle,
          ...textStyle,
          width: "100%",
          overflowWrap: "anywhere",
        }}
        title={open ? "" : text}
      >
        {text}
      </div>

      {truncated && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={compactButtonStyle}
        >
          {open ? "less" : "more"}
        </button>
      )}

      {open && (
        <div style={overlayCardStyle}>
          <div style={{ marginBottom: 8 }}>{text}</div>

          <button
            type="button"
            className="dx-btn dx-btn-outline"
            style={{ padding: "5px 8px", fontSize: 12 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {}
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpandableText