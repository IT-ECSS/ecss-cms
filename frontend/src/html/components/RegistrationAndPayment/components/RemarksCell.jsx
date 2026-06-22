import React from 'react';

const RemarksCell = (props) => {
  const { value, data } = props;

  const rawRemarks =
    data?.remarks ||
    value ||
    data?.official?.remarks ||
    data?.officialInfo?.remarks ||
    '';

  const getRoleColor = (role) => {
    const roleColors = {
      'NSA in-charge': '#0066cc',
      'Site in-charge': '#8D6E63',
      Finance: '#8B4513',
      Admin: '#cc0000',
      System: '#000000',
    };

    return roleColors[role] || '#000000';
  };

  // =========================
  // ROLE EXTRACT (HIDDEN)
  // =========================
  const extractRole = (line) => {
    const match = line.match(/^\[(.*?)\]:/);
    return match ? match[1] : 'System';
  };

  // =========================
  // NUMBER EXTRACT (KEEP IT)
  // =========================
  const extractNumber = (line) => {
    const match = line.match(/(\d+\))/);
    return match ? match[1] : '';
  };

  // =========================
  // CLEAN TEXT (REMOVE ONLY ROLE)
  // =========================
  const extractText = (line) => {
    return line.replace(/^\[.*?\]:\s*/, '');
  };

  // =========================
  // RENDER LIST
  // =========================
  const renderPlain = () => (
    <div className="remarks-list">
      {rawRemarks
        .split('\n')
        .filter(Boolean)
        .map((line, idx) => {
          const role = extractRole(line);
          const color = getRoleColor(role);

          const number = extractNumber(line);
          const text = extractText(line);

          return (
            <div
              key={idx}
              style={{
                borderLeft: `4px solid ${color}`,
                backgroundColor: `${color}12`,
                padding: '6px 8px',
                marginBottom: '6px',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  color: color,
                  fontWeight: 500,
                  whiteSpace: 'pre-wrap',
                  fontSize: '1.7rem',
                  lineHeight: '2rem',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                {/* NUMBER */}
                {number && (
                  <span style={{ fontWeight: 700 }}>
                    {number}
                  </span>
                )}

                {/* TEXT */}
                <span>{text}</span>
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <div className="remarks-cell-container">
      {rawRemarks ? renderPlain() : <span style={{ color: '#bbb' }}></span>}
    </div>
  );
};

export default RemarksCell;