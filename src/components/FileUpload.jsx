import React, { useRef, useState } from 'react';
import './FileUpload.css';

function FileUpload({ onFileSelect, onClose }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Types de fichiers acceptés
  const acceptedTypes = {
    image: 'image/jpeg,image/png,image/gif,image/webp',
    video: 'video/mp4,video/3gpp,video/quicktime',
    audio: 'audio/mpeg,audio/ogg,audio/wav,audio/mp4',
    document: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  // Taille maximale (25 MB pour WhatsApp)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  
  // Gérer la sélection de fichier
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      alert('Le fichier est trop volumineux. Maximum 25 MB.');
      return;
    }
    
    setSelectedFile(file);
    
    // Générer un aperçu pour les images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview({
          type: 'image',
          url: e.target.result
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setPreview({
        type: 'video',
        url: URL.createObjectURL(file)
      });
    } else if (file.type.startsWith('audio/')) {
      setPreview({
        type: 'audio',
        url: URL.createObjectURL(file)
      });
    } else {
      setPreview({
        type: 'document',
        name: file.name,
        size: formatFileSize(file.size)
      });
    }
  };
  
  // Formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  // Envoyer le fichier
  const handleSend = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    
    try {
      await onFileSelect(selectedFile, caption);
      onClose();
    } catch (error) {
      alert('Erreur lors de l\'envoi du fichier');
    } finally {
      setUploading(false);
    }
  };
  
  // Ouvrir le sélecteur pour un type spécifique
  const openFileSelector = (type) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptedTypes[type] || '*/*';
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="file-upload-overlay">
      <div className="file-upload-modal">
        {/* Header */}
        <div className="file-upload-header">
          <h3>Envoyer un fichier</h3>
          <button className="close-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        {/* Contenu */}
        <div className="file-upload-content">
          {!selectedFile ? (
            // Sélecteur de type
            <div className="file-type-selector">
              <button 
                className="file-type-btn" 
                onClick={() => openFileSelector('image')}
              >
                <span className="material-icons">image</span>
                <span>Photo</span>
              </button>
              
              <button 
                className="file-type-btn" 
                onClick={() => openFileSelector('video')}
              >
                <span className="material-icons">videocam</span>
                <span>Vidéo</span>
              </button>
              
              <button 
                className="file-type-btn" 
                onClick={() => openFileSelector('audio')}
              >
                <span className="material-icons">audiotrack</span>
                <span>Audio</span>
              </button>
              
              <button 
                className="file-type-btn" 
                onClick={() => openFileSelector('document')}
              >
                <span className="material-icons">description</span>
                <span>Document</span>
              </button>
            </div>
          ) : (
            // Aperçu et légende
            <div className="file-preview">
              {preview?.type === 'image' && (
                <img src={preview.url} alt="Aperçu" />
              )}
              
              {preview?.type === 'video' && (
                <video controls src={preview.url} />
              )}
              
              {preview?.type === 'audio' && (
                <div className="audio-preview">
                  <span className="material-icons">audiotrack</span>
                  <audio controls src={preview.url} />
                </div>
              )}
              
              {preview?.type === 'document' && (
                <div className="document-preview">
                  <span className="material-icons">description</span>
                  <div className="document-info">
                    <p className="document-name">{preview.name}</p>
                    <p className="document-size">{preview.size}</p>
                  </div>
                </div>
              )}
              
              {/* Légende */}
              <div className="caption-input">
                <input
                  type="text"
                  placeholder="Ajouter une légende..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={1024}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        {selectedFile && (
          <div className="file-upload-actions">
            <button 
              className="btn-secondary" 
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                setCaption('');
              }}
            >
              Changer
            </button>
            
            <button 
              className="btn-primary" 
              onClick={handleSend}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  Envoi...
                </>
              ) : (
                <>
                  <span className="material-icons">send</span>
                  Envoyer
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Input caché */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default FileUpload;