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
          gap: '0',
          minWidth: '420px',
          background: '#fff',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ========== HEADER ========== */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem',
          background: '#f0f0f0',
          borderBottom: '1px solid #ddd'
        }}>
          <span style={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>
            EDIT REMARKS
          </span>
          <button
            onClick={() => this.props.stopEditing()}
            style={{
              width: '28px',
              height: '28px',
              padding: 0,
              border: 'none',
              background: '#e74c3c',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ========== BODY ========== */}
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* SUB-SECTION 1: REMOVE ALL */}
          <div>
            <button 
              onClick={this.handleRemoveAll}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                background: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
            >
              🗑️ Remove All Remarks
            </button>
          </div>

          {/* DIVIDER */}
          <div style={{ height: '1px', background: '#ddd' }}></div>

          {/* SUB-SECTION 2: CHOOSE WHICH TO REMOVE */}
          <div style={{ 
            background: '#f9f9f9', 
            padding: '0.75rem', 
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>
              EXISTING REMARKS ({lines.length})
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              minHeight: '60px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {lines.length === 0 ? (
                <div style={{ color: '#bbb', fontSize: '0.9rem', fontStyle: 'italic', padding: '0.5rem' }}>
                  No remarks yet
                </div>
              ) : (
                lines.map((line, idx) => {
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
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${lineColor}25`;
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${lineColor}12`;
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                      title="Click to remove this remark"
                    >
                      {cleaned}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height: '1px', background: '#ddd' }}></div>

          {/* ADD NEW REMARK */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>
              ADD NEW REMARK
            </div>

            {/* PREVIEW FOR NEW REMARK */}
            <div style={{ 
              background: '#fffbf0', 
              padding: '0.6rem 0.75rem', 
              borderRadius: '4px',
              border: `2px solid ${color}`,
              fontSize: '0.85rem'
            }}>
              <span style={{ fontWeight: 600, color }}>
                [{role}]: {lines.length + 1} [{this.getCurrentDateTime()}]
              </span>
            </div>

            {/* INPUT */}
            <input
              ref={this.ref}
              type="text"
              value={this.state.value}
              onChange={this.handleChange}
              onKeyDown={this.handleKeyDown}
              placeholder="Type new remark... (Enter to save, Esc to cancel)"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: `2px solid ${color}`,
                borderRadius: '4px',
                outline: 'none',
                color: color,
                caretColor: color,
                fontWeight: 500,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default RemarksEditor;