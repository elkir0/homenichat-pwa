/**
 * Utilitaires pour la manipulation d'images
 */

/**
 * Améliorer la qualité d'un thumbnail en l'agrandissant
 */
export async function enhanceThumbnail(base64Data, targetWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculer les dimensions
      const aspectRatio = img.height / img.width;
      const targetHeight = targetWidth * aspectRatio;
      
      // Créer un canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Activer l'interpolation de meilleure qualité
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Dessiner l'image agrandie
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // Retourner la nouvelle image
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      // En cas d'erreur, retourner l'image originale
      resolve(base64Data);
    };
    
    // Charger l'image
    img.src = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:image/jpeg;base64,${base64Data}`;
  });
}

/**
 * Créer une image placeholder colorée
 */
export function createPlaceholder(width = 300, height = 300) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  
  // Fond gris clair
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, width, height);
  
  // Icône image au centre
  ctx.fillStyle = '#bdbdbd';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼️', width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
}