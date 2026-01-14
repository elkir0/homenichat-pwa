import React from 'react';
import packageJson from '../../package.json';
import './VersionInfo.css';

function VersionInfo() {
  // Timestamp du build pour être sûr qu'on a la dernière version
  const buildTime = new Date().toLocaleString('fr-FR', { 
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="version-info">
      <span className="version-label">Version</span>
      <span className="version-number">{packageJson.version}</span>
      <span className="version-date">{buildTime}</span>
    </div>
  );
}

export default VersionInfo;