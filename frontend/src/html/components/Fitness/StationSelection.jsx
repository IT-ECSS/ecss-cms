import React, { Component } from 'react';
import '../../../css/fftParticipants.css';

export const STATIONS = [
  {
    id: 'measurement',
    num: '📏',
    title: 'Measurement Station',
    titleZh: '测量站',
    icon: 'fa-ruler-combined',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    fields: [
      { key: 'height', label: 'Height (cm)', labelZh: '身高', type: 'number', placeholder: 'e.g. 165' },
      { key: 'weight', label: 'Weight (kg)', labelZh: '体重', type: 'number', placeholder: 'e.g. 60' },
      { key: 'bmi', label: 'BMI', labelZh: 'BMI', type: 'number', placeholder: 'e.g. 22.5' },
    ],
  },
  {
    id: 'station1',
    num: '1',
    title: '30-Sec Sit and Stand',
    titleZh: '30 秒坐立测验',
    icon: 'fa-chair',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'sitStand', label: 'Number of reps', labelZh: '次数', type: 'number', placeholder: 'e.g. 12' },
    ],
    remarksKey: 'sitStandRemarks',
  },
  {
    id: 'station2',
    num: '2',
    title: '30-Sec Arm Curl',
    titleZh: '30 秒手臂卷起',
    icon: 'fa-dumbbell',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'armCurl', label: 'Number of reps', labelZh: '次数', type: 'number', placeholder: 'e.g. 15' },
    ],
    remarksKey: 'armCurlRemarks',
  },
  {
    id: 'station3',
    num: '3',
    title: '2-Min On-the-spot Marching',
    titleZh: '2 分钟抬膝测验',
    icon: 'fa-walking',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'march', label: 'Number of steps', labelZh: '步数', type: 'number', placeholder: 'e.g. 80' },
    ],
    remarksKey: 'marchRemarks',
  },
  {
    id: 'station4',
    num: '4',
    title: 'Sit and Reach Test',
    titleZh: '坐椅体前弯',
    icon: 'fa-arrows-alt-h',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'sitReachAtt1', label: 'Result (cm)', labelZh: '成绩', type: 'number', placeholder: 'e.g. 5', required: true },
    ],
    resultKey: 'sitReach',
    note: '左 L / 右 R (直腿 Straight leg)',
    remarksKey: 'sitReachRemarks',
  },
  {
    id: 'station5',
    num: '5',
    title: 'Back Stretching Test',
    titleZh: '抓背测验',
    icon: 'fa-hand-paper',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'backStretchAtt1', label: 'Result (cm)', labelZh: '成绩', type: 'number', placeholder: 'e.g. -2', required: true },
    ],
    resultKey: 'backStretch',
    note: '左 L / 右 R (上面 Hand on top)',
    remarksKey: 'backStretchRemarks',
  },
  {
    id: 'station6',
    num: '6',
    title: '2.44m Speed Walk',
    titleZh: '2.44 公尺起身绕物测验',
    icon: 'fa-stopwatch',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'speedWalkAtt1', label: 'Result (seconds)', labelZh: '成绩（秒）', type: 'number', placeholder: 'e.g. 5.2', required: true },
    ],
    resultKey: 'speedWalk',
    remarksKey: 'speedWalkRemarks',
  },
  {
    id: 'station7',
    num: '7',
    title: 'Hand Grip Test',
    titleZh: '握力测试',
    icon: 'fa-fist-raised',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'gripTestAtt1', label: 'Result (kg)', labelZh: '成绩', type: 'number', placeholder: 'e.g. 25', required: true },
    ],
    resultKey: 'gripTest',
    note: '左 L / 右 R (手 Hand)',
    remarksKey: 'gripTestRemarks',
  },
];

class StationSelection extends Component {
  renderStationButton = (station) => {
    const label = station.id === 'measurement'
      ? `📏 ${station.title}`
      : `${station.num}. ${station.title}`;

    return (
      <button
        key={station.id}
        type="button"
        className="fft-event-btn"
        style={{ borderLeft: `4px solid ${station.color}` }}
        onClick={() => this.props.onSelectStation(station)}
      >
        <div className="fft-event-btn-name">{label}</div>
        <div style={{ fontSize: '0.85em', color: '#888', marginTop: '2px' }}>{station.titleZh}</div>
      </button>
    );
  };

  render() {
    const stations = this.props.stations || STATIONS;

    return (
      <>
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Select Station</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Please select your station to continue.
              </div>
            </div>
            <div className="fft-events-buttons-container">
              {stations.map(this.renderStationButton)}
            </div>
      </>
    );
  }
}

export default StationSelection;
