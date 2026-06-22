import React from 'react';
import { editRemarksField } from '../services/registrationApi';

const ROLE_COLORS = {
  'NSA in-charge': '#1976D2',
  'Site in-charge': '#8D6E63',
  Finance: '#F57C00',
  Admin: '#D32F2F',
  System: '#000000'
};

class RemarksEditor extends React.Component {
  constructor(props) {
    super(props);

    const isNewRow = !props.data?.id && !props.data?._id;

    this.state = {
      value: isNewRow ? '' : (props.value || '')
    };

    this.ref = React.createRef();
  }

  componentDidMount() {
    this.setState({ value: '' });

    setTimeout(() => {
      this.ref.current?.focus();
      this.ref.current?.select?.();
    }, 0);
  }

  // =========================
  // ROLE
  // =========================
  getRole = () => this.props.role || 'System';

  getRoleColor = (role) => ROLE_COLORS[role] || '#000';

  // =========================
  // DATE TIME
  // =========================
  getCurrentDateTime = () => {
    const now = new Date();

    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // =========================
  // GET LINES (SOURCE OF TRUTH)
  // =========================
  getLines = () => {
    return (this.props.value || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  };

  // =========================
  // RESET NUMBERING LOGIC
  // =========================
  getNextNumber = () => {
    return this.getLines().length + 1;
  };

  // =========================
  // BUILD NEW LINE (FIXED RESET LOGIC)
  // =========================
  getValue = () => {
    const trimmed = this.state.value.trim();
    if (!trimmed) return this.props.value || '';

    const role = this.getRole();
    const timestamp = this.getCurrentDateTime();

    const lines = this.getLines();
    const nextNumber = lines.length + 1;

    const newLine =
      `[${role}]: ${nextNumber}) [${timestamp}] ${trimmed}`;

    if (lines.length === 0) return newLine;

    return `${lines.join('\n')}\n${newLine}`;
  };

  // =========================
  // DELETE SINGLE LINE
  // =========================
  removeLine = async (index) => {
    const id = this.props.data?.id || this.props.data?._id;

    const lines = this.getLines();
    lines.splice(index, 1);

    const updated = lines.join('\n');
    console.log('Updated remarks after removing line:', updated);

    try {
      await editRemarksField(id, 'remarks', updated);
      this.props.stopEditing();
    } catch (err) {
      console.error('Failed to remove remark line:', err);
    }
  };

  handleChange = (e) => {
    this.setState({ value: e.target.value });
  };

  handleKeyDown = async (e) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();

    if (e.key === 'Enter') {
      e.preventDefault();

      try {
        const id = this.props.data?.id || this.props.data?._id;

        await editRemarksField(id, 'remarks', this.getValue());

        this.props.stopEditing();
      } catch (err) {
        console.error('Failed to save remarks:', err);
      }
    }

    if (e.key === 'Escape') {
      this.setState({ value: '' });
      this.props.stopEditing();
    }
  };

  handleRemoveAll = async (e) => {
    e.stopPropagation();

    const id = this.props.data?.id || this.props.data?._id;

    try {
      await editRemarksField(id, 'remarks', '');
      this.setState({ value: '' });
      this.props.stopEditing();
    } catch (err) {
      console.error('Failed to remove remarks:', err);
    }
  };

  render() {
    const role = this.getRole();
    const color = this.getRoleColor(role);

    const lines = this.getLines();

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          minWidth: '420px',
          padding: '0.75rem',
          background: '#fff'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* REMOVE ALL */}
        <button onClick={this.handleRemoveAll}>
          Remove All
        </button>

        {/* PREVIEW */}
        <div style={{ fontWeight: 600, color }}>
          Next: [{role}]: {lines.length + 1} [{this.getCurrentDateTime()}]
        </div>

        {/* EXISTING REMARKS (CLICK TO DELETE) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {lines.map((line, idx) => {
            const roleMatch = line.match(/^\[(.*?)\]:/);
            const lineRole = roleMatch ? roleMatch[1] : 'System';
            const lineColor = this.getRoleColor(lineRole);

            const cleaned = line.replace(/^\[.*?\]:\s*/, '');

            return (
              <div
                key={idx}
                onClick={() => this.removeLine(idx)}
                style={{
                  borderLeft: `4px solid ${lineColor}`,
                  backgroundColor: `${lineColor}12`,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: lineColor,
                  fontWeight: 500
                }}
                title="Click to remove"
              >
                {cleaned}
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <input
          ref={this.ref}
          type="text"
          value={this.state.value}
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          placeholder="Type remarks..."
          style={{
            width: '100%',
            padding: '0.5rem',
            border: `2px solid ${color}`,
            borderRadius: '4px',
            outline: 'none',
            color: color,
            caretColor: color,
            fontWeight: 500
          }}
        />
      </div>
    );
  }
}

export default RemarksEditor;