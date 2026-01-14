import React, { useState, useEffect } from 'react';
import './VersionAlert.css';

const VersionAlert = () => {
    const [status, setStatus] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('/api/version/check');
                if (response.ok) {
                    const data = await response.json();
                    if (data.updateAvailable) {
                        setStatus(data);
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                console.error('Failed to check version:', error);
            }
        };

        // Check on mount
        checkVersion();

        // Check every hour
        const interval = setInterval(checkVersion, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Masquer sur mobile/tablette (moins de 768px)
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;

    if (!isVisible || !status || !isDesktop) return null;

    return (
        <div className="version-alert">
            <div className="version-alert-content">
                <span className="material-icons warning-icon">warning_amber</span>
                <div className="version-message">
                    <strong>Mise à jour de sécurité Baileys requise !</strong>
                    <span>Version actuelle: {status.current} → Nouvelle version: {status.latest}</span>
                </div>
                <button className="close-alert" onClick={() => setIsVisible(false)}>
                    <span className="material-icons">close</span>
                </button>
            </div>
        </div>
    );
};

export default VersionAlert;
