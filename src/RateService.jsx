import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function RateService({ workerId, workerName, onBack }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      alert('Por favor escribe un comentario sobre el desempeño.');
      return;
    }

    setLoading(true);
    try {
      // Guarda la reseña en la colección 'reviews' de Firebase Firestore (igual que en tu código Flutter)
      await addDoc(collection(db, 'reviews'), {
        workerId: workerId || 'general',
        workerName: workerName || 'Colaborador TECCO',
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString(),
      });

      alert('¡Gracias por calificar el servicio!');
      if (onBack) onBack();
    } catch (e) {
      console.error("Error al enviar reseña:", e);
      alert(`Error al enviar reseña: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '20px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '450px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #E0E0E0', paddingBottom: '12px' }}>
        {onBack && (
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: '#00A887' }}
          >
            ← Volver
          </button>
        )}
        <h2 style={{ fontSize: '20px', color: '#1E2A38', margin: 0, fontWeight: '700' }}>Calificar Servicio</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '45px' }}>⭐</span>
        <h3 style={{ fontSize: '18px', color: '#1E2A38', margin: '10px 0 4px 0', fontWeight: 'bold' }}>
          Califica la atención de {workerName || 'nuestro especialista'}
        </h3>
        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Tu opinión ayuda a mejorar la comunidad en Playa del Carmen.</p>
      </div>

      {/* Selector de Estrellas (1 a 5) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
        {[1, 2, 3, 4, 5].map((index) => (
          <button
            key={index}
            onClick={() => setRating(index)}
            style={{ background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', padding: 0 }}
          >
            {index <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Campo de Comentarios */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
          Comentarios sobre el desempeño
        </label>
        <textarea
          rows="4"
          placeholder="Escribe tu experiencia con el servicio..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box', fontSize: '14px', fontFamily: 'inherit' }}
        />
      </div>

      {/* Botón de Enviar Evaluación */}
      <button
        onClick={handleSubmitReview}
        disabled={loading}
        style={{ 
          backgroundColor: '#00A887', 
          color: '#FFFFFF', 
          border: 'none', 
          width: '100%', 
          padding: '14px', 
          borderRadius: '10px', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          boxShadow: '0 4px 10px rgba(0, 168, 135, 0.25)',
          opacity: loading ? 0.7 : 1 
        }}
      >
        {loading ? 'Enviando evaluación...' : 'Enviar Evaluación'}
      </button>

    </div>
  );
}