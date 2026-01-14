import React, { useEffect } from 'react';

function SimpleImageViewer({ image, onClose }) {
  
  useEffect(() => {
    
    // Créer l'élément directement dans le DOM
    const viewer = document.createElement('div');
    viewer.id = 'simple-image-viewer';
    viewer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      cursor: zoom-out;
    `;
    
    viewer.innerHTML = `
      <div style="position: relative; max-width: 90vw; max-height: 90vh;">
        <img 
          src="${image.src}" 
          alt="Image" 
          style="max-width: 100%; max-height: 90vh; object-fit: contain;"
        />
        <button 
          id="close-viewer-btn"
          style="
            position: absolute;
            top: -50px;
            right: 0;
            background: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >×</button>
        ${image.caption ? `<div style="color: white; text-align: center; margin-top: 10px;">${image.caption}</div>` : ''}
      </div>
    `;
    
    // Ajouter les event listeners
    viewer.onclick = (e) => {
      if (e.target === viewer) {
        viewer.remove();
        onClose();
      }
    };
    
    const closeBtn = viewer.querySelector('#close-viewer-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        viewer.remove();
        onClose();
      };
    }
    
    // Ajouter au body
    document.body.appendChild(viewer);
    
    // Cleanup
    return () => {
      const existingViewer = document.getElementById('simple-image-viewer');
      if (existingViewer) {
        existingViewer.remove();
      }
    };
  }, [image, onClose]);
  
  return null;
}

export default SimpleImageViewer;