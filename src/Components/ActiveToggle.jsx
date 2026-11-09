import React from "react";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

/**
 * Single Active / Inactive toggle button (replaces checkbox).
 */
const ActiveToggle = ({ value, onChange, label = "Status", fullWidth = false }) => {
  const on = value !== false;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: fullWidth ? "100%" : undefined }}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</span>
      )}
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 40,
          padding: "0 14px",
          borderRadius: 8,
          border: `1px solid ${on ? "#10b981" : "#cbd5e1"}`,
          backgroundColor: on ? "#ecfdf5" : "#f1f5f9",
          color: on ? "#047857" : "#64748b",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          width: fullWidth ? "100%" : "auto",
          transition: "all 0.15s ease",
        }}
      >
        {on ? <FaToggleOn size={22} /> : <FaToggleOff size={22} />}
        {on ? "Active" : "Inactive"}
      </button>
    </div>
  );
};

export default ActiveToggle;
