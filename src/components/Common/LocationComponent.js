import { Spin } from "antd";
import { ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';

// Fullscreen overlay loader with timer
const LocationLoadingOverlay = ({ visible, timer, onCancel }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }}>

      {/* ✅ Close button — top right corner */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.4)',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
        title="Cancel location tracking"
      >
        <CloseOutlined style={{ color: '#fff', fontSize: '14px' }} />
      </div>

      <Spin size="large" />

      <div style={{
        fontSize: '18px',
        fontWeight: '500',
        color: '#fff',
        textAlign: 'center'
      }}>
        Please wait, we are gathering your location...
      </div>

      <div style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ClockCircleOutlined />
        <span>{timer}s</span>
      </div>

      {/* ✅ Cancel button at bottom */}
      <div
        onClick={onCancel}
        style={{
          marginTop: '8px',
          padding: '8px 28px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.6)',
          backgroundColor: 'transparent',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
          e.currentTarget.style.borderColor = '#fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
        }}
      >
        Cancel
      </div>

    </div>
  );
};

// Info banner with different states
const LocationInfoBanner = ({ selectedLocation, currentAccuracy, timeTaken, isGettingLocation }) => {
  if (isGettingLocation) {
    return (
      <div style={{
        marginBottom: '12px',
        padding: '10px',
        background: '#fff7e6',
        borderRadius: '4px',
        border: '1px solid #ffd591'
      }}>
        <span style={{ fontWeight: '500' }}>⏳ Getting location...</span>
      </div>
    );
  }

  if (selectedLocation && currentAccuracy && timeTaken) {
    return (
      <div style={{
        marginBottom: '12px',
        padding: '10px',
        background: '#f6ffed',
        borderRadius: '4px',
        border: '1px solid #b7eb8f'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: '500', color: '#52c41a' }}>
            ✅ Location acquired successfully!
          </span>
          <span style={{ fontSize: '13px', color: '#595959' }}>
            📍Accuracy: {currentAccuracy.toFixed(1)} meters | ⏱️ Time taken: {timeTaken}s
          </span>
        </div>
      </div>
    );
  }

  if (selectedLocation && !currentAccuracy && !timeTaken) {
    return (
      <div style={{
        marginBottom: '12px',
        padding: '10px',
        background: '#e6f7ff',
        borderRadius: '4px',
        border: '1px solid #91d5ff'
      }}>
        <span style={{ fontWeight: '500', color: '#1890ff' }}>
          📍 Location selected: {selectedLocation.address}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: '12px',
      padding: '10px',
      background: '#e6f7ff',
      borderRadius: '4px'
    }}>
      <span> ! Click anywhere on the map (or) Click "Use Current Location" button</span>
    </div>
  );
};

export { LocationLoadingOverlay, LocationInfoBanner };