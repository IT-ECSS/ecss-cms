import React from 'react';

/**
 * AG-Grid cell renderer for the Age column (NSA courses).
 * Green when age >= 50, red when age < 50.
 *
 * Props (AG-Grid params object):
 *   params.value – the participant's current age (number) or null/'' when unknown
 */
const AgeRenderer = (params) => {
  const age = params.value;

  if (age === null || age === undefined || age === '') {
    return null;
  }

  const isSenior = Number(age) >= 50;

  return (
    <span
      style={{
        display: 'block',
        textAlign: 'center',
        width: '100%',
        fontWeight: 700,
        color: isSenior ? '#2E7D32' : '#C62828',
      }}
    >
      {age}
    </span>
  );
};

export default AgeRenderer;
