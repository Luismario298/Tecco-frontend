import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function RealtimeChat({ 
  salaId, 
  currentUserRole, 
  currentUserName, 
  contraparteNombre, 
  onClose 
}) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cotizacionMonto, setCotizacionMonto] = useState('');
  const [mostrarCotizador, setMostrarCotizador] = useState(false);
  const mensajesEndRef = useRef(null);

  // Identificador único de la sala (si no viene un ID de solicitud, usa uno general entre ambos)
  const chatRoomId = salaId || `sala_${contraparteNombre || 'general'}`.replace(/\s+/g, '_');

  useEffect(() => {
    const q = query(
      collection(db, 'mensajes_chat'),
      where('salaId', '==', chatRoomId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaMensajes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMensajes(listaMensajes);
    }, (error) => {
      console.error("Error en tiempo real del chat:", error);
    });

    return () => unsubscribe();
  }, [chatRoomId]);

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const textoAEnviar = nuevoMensaje;
    setNuevoMensaje('');

    try {
      await addDoc(collection(db, 'mensajes_chat'), {
        salaId: chatRoomId,
        remitenteRol: currentUserRole || 'cliente',
        remitenteNombre: currentUserName || (currentUserRole === 'trabajador' ? 'Especialista' : 'Cliente'),
        texto: textoAEnviar,
        tipo: 'texto',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  const handleEnviarCotizacion = async (e) => {
    e.preventDefault();
    if (!cotizacionMonto.trim()) return;

    const monto = cotizacionMonto;
    setCotizacionMonto('');
    setMostrarCotizador(false);

    try {
      await addDoc(collection(db, 'mensajes_chat'), {
        salaId: chatRoomId,
        remitenteRol: currentUserRole || 'trabajador',
        remitenteNombre: currentUserName || 'Especialista',
        texto: `💲 Propuesta de Cotización Formal: $${monto} MXN`,
        tipo: 'cotizacion',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al enviar cotización:", error);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '16px', fontFamily: 'Inter, Poppins, sans-serif' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', maxWidth: '480px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        
        {/* Cabecera del Chat */}
        <div style={{ backgroundColor: '#00A887', color: '#FFFFFF', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', margin: 0, fontWeight: '700' }}>💬 {contraparteNombre || 'Chat en Vivo'}</h3>
            <p style={{ fontSize: '11px', margin: '2px 0 0 0', opacity: 0.9 }}>🟢 En línea · Canal Directo TECCO</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button"
              onClick={() => setMostrarCotizador(!mostrarCotizador)}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              💲 Cotizar
            </button>
            <button 
              onClick={onClose} 
              style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', color: '#FFF', width: '30px', height: '30px', borderRadius: '50%', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra desplegable de Cotización Rápida */}
        {mostrarCotizador && (
          <form onSubmit={handleEnviarCotizacion} style={{ backgroundColor: '#E6F6F3', padding: '10px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #B2F5EA' }}>
            <input 
              type="number" 
              placeholder="Monto en MXN (ej. 450)" 
              value={cotizacionMonto}
              onChange={(e) => setCotizacionMonto(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #00A887', fontSize: '13px' }}
              required
            />
            <button type="submit" style={{ backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              Enviar Precio
            </button>
          </form>
        )}

        {/* Área de Mensajes */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F8F9FA' }}>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#718096', backgroundColor: '#EDF2F7', padding: '6px 12px', borderRadius: '12px', alignSelf: 'center', marginBottom: '6px' }}>
            🔒 Conversación protegida y sincronizada en tiempo real.
          </div>

          {mensajes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#A0AEC0', fontSize: '13px', marginTop: '40px' }}>
              Aún no hay mensajes. Escribe para iniciar la negociación...
            </p>
          ) : (
            mensajes.map((msg) => {
              const esMio = msg.remitenteRol === currentUserRole;
              const esCotizacion = msg.tipo === 'cotizacion';

              return (
                <div 
                  key={msg.id} 
                  style={{ 
                    alignSelf: esMio ? 'flex-end' : 'flex-start',
                    backgroundColor: esCotizacion ? '#FEFCBF' : (esMio ? '#00A887' : '#FFFFFF'),
                    color: esCotizacion ? '#744210' : (esMio ? '#FFFFFF' : '#2D3748'),
                    border: esCotizacion ? '1px solid #F6E05E' : (esMio ? 'none' : '1px solid #EDF2F7'),
                    padding: '10px 14px',
                    borderRadius: '14px',
                    maxWidth: '78%',
                    fontSize: '13px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.75, marginBottom: '3px' }}>
                    {esMio ? 'Tú' : msg.remitenteNombre}
                  </div>
                  <div style={{ fontWeight: esCotizacion ? 'bold' : 'normal' }}>{msg.texto}</div>
                </div>
              );
            })
          )}
          <div ref={mensajesEndRef} />
        </div>

        {/* Formulario de Envío */}
        <form onSubmit={handleEnviarMensaje} style={{ padding: '12px 16px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EDF2F7', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Escribe un mensaje..." 
            value={nuevoMensaje} 
            onChange={(e) => setNuevoMensaje(e.target.value)} 
            style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px', backgroundColor: '#F8F9FA', outline: 'none' }} 
          />
          <button 
            type="submit" 
            style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '0 18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            Enviar
          </button>
        </form>

      </div>
    </div>
  );
}