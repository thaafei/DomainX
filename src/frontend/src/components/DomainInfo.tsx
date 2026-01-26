import React from 'react';

interface DomainInfoProps {
  selectedDomain: any;
}

const DomainInfo: React.FC<DomainInfoProps> = ({ selectedDomain }) => {
  return (
    <div
      className="dx-card"
      style={{
        width: 260,
        padding: 18,
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        color: "var(--text-main)"
      }}
    >
      <h3 style={{ marginTop: 0, color: "var(--accent)" }}>Details</h3>

      <div className="dx-info-field"><strong>Name:</strong> {selectedDomain?.domain_name || "N/A"}</div>
      <div className="dx-info-field"><strong>Version:</strong> {selectedDomain?.description || "No version available"}</div>
      <div className="dx-info-field">
        <strong>Authors:</strong>
        <ul style={{ margin: "6px 0 0 16px" }}>
          <li>Unknown</li>
          <li>Unknown</li>
        </ul>
      </div>
      <div className="dx-info-field">
        <strong>Description:</strong>
        <p style={{ marginTop: 6, opacity: 0.75 }}>
          Placeholder description text about the domain.
        </p>
      </div>
      <div className="dx-info-field">
        <strong>Link:</strong> <a href="#" style={{ color: "var(--accent)" }}>Research Paper</a>
      </div>
    </div>
  );
};

export default DomainInfo;
