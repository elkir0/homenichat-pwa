import React from 'react';
import './WhatsAppConnect.css';
import './NewChatDialog.css'; // Reuse dialog styles

function WhatsAppConnect({ isOpen, onClose, qrCode, connectionState, onRetry }) {
    if (!isOpen) return null;

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>Connecter WhatsApp</h2>
                    <button className="btn btn-icon" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="dialog-content">
                    <div className="qr-container">
                        {connectionState === 'connected' ? (
                            <div className="qr-placeholder">
                                <span className="material-icons" style={{ fontSize: '48px', color: '#25D366' }}>check_circle</span>
                                <p>WhatsApp est connecté !</p>
                            </div>
                        ) : qrCode ? (
                            <>
                                <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
                                <ol className="instruction-list">
                                    <li>Ouvrez WhatsApp sur votre téléphone</li>
                                    <li>Allez dans <b>Réglages</b> ou <b>Menu</b></li>
                                    <li>Sélectionnez <b>Appareils connectés</b></li>
                                    <li>Tapez sur <b>Connecter un appareil</b></li>
                                    <li>Scannez ce code QR</li>
                                </ol>
                            </>
                        ) : (
                            <div className="qr-placeholder">
                                {connectionState === 'connecting' ? (
                                    <>
                                        <span className="material-icons spinning">sync</span>
                                        <p>Génération du QR Code...</p>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons">signal_wifi_off</span>
                                        <p>Déconnecté</p>
                                        <button className="btn btn-primary" onClick={onRetry}>
                                            Réessayer
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        <div className={`status-badge ${connectionState}`}>
                            {connectionState === 'connected' && 'Connecté'}
                            {connectionState === 'connecting' && 'Connexion...'}
                            {connectionState === 'disconnected' && 'Déconnecté'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WhatsAppConnect;
