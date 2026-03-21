const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  title,
  message,
  confirmText = "Run",
  cancelText = "Cancel",
  busy,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 18,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(700px, 100%)",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(18, 20, 28, 0.92)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 0.6,
                opacity: 0.75,
                color: "rgba(220,230,255,0.85)",
              }}
            >
              CONFIRMATION
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                color: "rgba(235,238,245,0.92)",
              }}
            >
              Are you sure you want to run analysis?
            </div>
          </div>

          <div
            style={{
              width: 10,
              height: 46,
              borderRadius: 10,
              background: "var(--accent)",
              opacity: 0.9,
              boxShadow: "0 0 18px rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 14,
              color: "rgba(210,216,228,0.86)",
              marginBottom: 10,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(210,216,228,0.86)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "12px 12px",
            }}
          >
            {message}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 14,
            }}
          >
            <button
              className="dx-btn dx-btn-outline"
              onClick={onCancel}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              {cancelText}
            </button>

            <button
              className="dx-btn dx-btn-primary"
              onClick={onConfirm}
              disabled={!!busy}
              style={{
                opacity: busy ? 0.7 : 1,
                filter: "saturate(1.05)",
              }}
            >
              {busy ? "Starting..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal