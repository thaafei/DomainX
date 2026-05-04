import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { clamp2Style, clamp3Style, compactButtonStyle, overlayCardStyle} from "./CellComponents";

const clamp4Style: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 4,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const ExpandableText: React.FC<{
  text: string;
  lines?: 2 | 3 | 4;
  emptyText?: string;
  textStyle?: React.CSSProperties;
  preserveWhitespace?: boolean;
  description?: string;
  onToggle?: (isOpen: boolean) => void;
}> = ({ text, lines = 2, emptyText = "—", textStyle, preserveWhitespace = false, description, onToggle }) => {
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
  }, [text, lines, description]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onToggle?.(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onToggle?.(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onToggle]);

  if (!text) {
    return <div style={textStyle}>{emptyText}</div>;
  }

  const clampStyle = lines === 4 ? clamp4Style : lines === 3 ? clamp3Style : clamp2Style;

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
          whiteSpace: preserveWhitespace ? "pre-wrap" : undefined,
        }}
        title={open ? "" : text}
      >
        {text}
      </div>

      {truncated && (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            onToggle?.(!open);
          }}
          style={compactButtonStyle}
        >
          {open ? "less" : "more"}
        </button>
      )}

      {open && (
        <div
          style={{
            ...overlayCardStyle,
            whiteSpace: preserveWhitespace ? "pre-wrap" : "pre-wrap",
            fontFamily: preserveWhitespace
              ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
              : undefined,
            fontSize: preserveWhitespace ? 12.5 : undefined,
            lineHeight: preserveWhitespace ? 1.35 : undefined,
          }}
        >
          {description ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--accent)" }}>
                Value:
              </div>
              <div style={{ marginBottom: 12 }}>{text || emptyText}</div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--accent)" }}>
                Description:
              </div>
              <div>{description}</div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableText
