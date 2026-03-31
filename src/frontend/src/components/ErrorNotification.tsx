const ErrorNotification: React.FC<{ show: boolean; message: string }> = ({
  show,
  message,
}) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10001,
        background: "rgba(255, 77, 79, 0.92)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "white",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        maxWidth: "min(720px, calc(100vw - 32px))",
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {message}
    </div>
  );
};

export default ErrorNotification
