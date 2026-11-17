import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const COLORS = {
  primary: '#00A887',
  secondary: '#1E2A38',
  background: '#0B131A',
  card: '#16222D',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37',
  accentWorker: '#F59E0B'
};

export default function UploadPortfolio({ workerEmail, workerName, onBack }) {
  const [fotoUrl, setFotoUrl] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const handleGuardarFoto = async (e) => {
    e.preventDefault();
    if (!fotoUrl.trim()) {
      alert("Por favor ingresa la URL de la foto de tu trabajo.");
      return;
    }

    setSubiendo(true);
    try {
      await addDoc(collection(db, 'trabajadores_portafolio'), {
        email: workerEmail.trim().toLowerCase(),
        nombreColaborador: workerName || 'Especialista',
        foto_url: fotoUrl.trim(),
        descripcion: descripcion.trim() || 'Trabajo realizado en Playa del Carmen',
        fecha: serverTimestamp()
      });

      alert("✅ ¡Foto agregada con éxito a tu portafolio!");
      setFotoUrl("");
      setDescripcion("");
      onBack(); // Regresa al panel
    } catch (error) {
      console.error("Error al subir foto al portafolio:", error);
      alert("No se pudo guardar la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '24px 16px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        
        <button 
          onClick={onBack}
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Regresar al Panel
        </button>

        <div style={{ backgroundColor: COLORS.card, padding: '24px', borderRadius: '20px', border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: COLORS.accentWorker, margin: '0 0 6px 0' }}>📸 Agregar Trabajo al Portafolio</h2>
          <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 20px 0' }}>Sube evidencias de tus reparaciones para que los clientes las vean en tu perfil.</p>

          <form onSubmit={handleGuardarFoto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>URL de la Imagen</label>
              <input 
                type="url" 
                placeholder="https://ejemplo.com/foto-reparacion.jpg" 
                value={fotoUrl} 
                onChange={(e) => setFotoUrl(e.target.value)} 
                required
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box', fontSize: '13px' }} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Descripción del trabajo</label>
              <textarea 
                rows="3"
                placeholder="Ej. Instalación de minisplit inverter en Villas del Sol..." 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box', fontSize: '13px', fontFamily: 'inherit' }} 
              />
            </div>

            <button 
              type="submit" 
              disabled={subiendo}
              style={{ backgroundColor: COLORS.accentWorker, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '6px', width: '100%' }}
            >
              {subiendo ? 'Guardando...' : '💾 Publicar en mi Portafolio'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}