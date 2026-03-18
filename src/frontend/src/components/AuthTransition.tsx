import React from "react";

interface Props {
  message?: string;
}

const AuthTransition: React.FC<Props> = ({ message = "Just a moment" }) => {
  return (
    <div
      className="dx-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div className="stars"></div>

      <div
        className="dx-card"
        style={{
          padding: "28px 36px",
          textAlign: "center",
          minWidth: "240px",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: "1rem",
            fontWeight: 500,
            letterSpacing: "0.2px",
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
};

export default AuthTransition;