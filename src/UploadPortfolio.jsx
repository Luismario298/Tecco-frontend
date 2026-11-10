import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CloudinaryService } from './cloudinaryService';

export default function UploadPortfolio({ workerEmail, workerName, onBack }) {
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [descripcion, setDescripcion] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const handleSubirTrabajo = async (e) => {
    e.preventDefault();
    if (!imagenArchivo) {
      alert('Por favor selecciona una imagen para subir.');
      return;
    }

    setSubiendo(true);
    try {
      const urlImagen = await CloudinaryService.subirImagen(imagenArchivo);

      if (!urlImagen) {
        throw new Error('No se pudo obtener la URL de la imagen en Cloudinary.');
      }

      // 1. Guarda en la colección de portafolios
      await addDoc(collection(db, 'trabajadores_portafolio'), {
        email: workerEmail || 'trabajador@tecco.com',
        nombre: workerName || 'Colaborador',
        foto_url: urlImagen,
        descripcion: descripcion || 'Trabajo realizado en Playa del Carmen',
        fecha: serverTimestamp()
      });

      // 2. Actualiza también el campo principal 'fotosTrabajos' en la colección 'trabajadores' para que se vea en el perfil
      const q = query(collection(db, 'trabajadores'), where('email', '==', workerEmail));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (documento) => {
        const trabajadorRef = doc(db, 'trabajadores', documento.id);
        await updateDoc(trabajadorRef, {
          fotosTrabajos: urlImagen
        });
      });

      alert('¡Imagen de trabajo subida y mostrada en tu perfil con éxito!');
      setImagenArchivo(null);
      setDescripcion("");
      if (onBack) onBack();
    } catch (error) {
      console.error("Error al subir imagen al portafolio:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '20px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '450px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #E0E0E0', paddingBottom: '12px' }}>
        {onBack && (
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: '#00A887' }}
          >
            ← Volver
          </button>
        )}
        <h2 style={{ fontSize: '20px', color: '#1E2A38', margin: 0, fontWeight: '700' }}>Mi Portafolio Profesional</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '40px' }}>📸</span>
        <h3 style={{ fontSize: '18px', color: '#1E2A38', margin: '10px 0 4px 0', fontWeight: 'bold' }}>
          Sube fotos de tus trabajos previos
        </h3>
        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Muestra a los clientes en Playa del Carmen la calidad de tus servicios.</p>
      </div>

      <form onSubmit={handleSubirTrabajo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ backgroundColor: '#F5F7FA', padding: '16px', borderRadius: '12px', border: '2px dashed #00A887', textAlign: 'center' }}>
          <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
            📁 Seleccionar Imagen de tu Dispositivo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagenArchivo(e.target.files[0])}
            style={{ fontSize: '12px', width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
            Descripción del trabajo realizado
          </label>
          <textarea
            rows="3"
            placeholder="Ej. Instalación de aire acondicionado inverter en Villas del Sol..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box', fontSize: '14px', fontFamily: 'inherit' }}
          />
        </div>

        <button
          type="submit"
          disabled={subiendo}
          style={{ 
            backgroundColor: '#00A887', 
            color: '#FFFFFF', 
            border: 'none', 
            width: '100%', 
            padding: '14px', 
            borderRadius: '10px', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            cursor: subiendo ? 'wait' : 'pointer', 
            boxShadow: '0 4px 10px rgba(0, 168, 135, 0.25)',
            opacity: subiendo ? 0.7 : 1 
          }}
        >
          {subiendo ? 'Subiendo imagen a Cloudinary...' : 'Publicar en mi Portafolio'}
        </button>

      </form>
    </div>
  );
}