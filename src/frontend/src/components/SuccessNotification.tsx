import React from "react";

interface SuccessNotificationProps {
  show: boolean;
  message: string;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({ show, message }) => {
  if (!show) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#4CAF50",
          color: "white",
          padding: "16px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          animation: "slideDown 0.3s ease-out",
          zIndex: 9999,
        }}
      >
        <span style={{ fontSize: "20px" }}>✓</span>
        <span>{message}</span>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default SuccessNotification;
