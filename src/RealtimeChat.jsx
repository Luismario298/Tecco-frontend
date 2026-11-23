import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';

const COLORS = {
  primary: '#00A887',
  bubbleMine: '#005C4B',
  bubbleOther: '#1F2C34',
  headerBg: '#16222D',
  chatBg: '#0B131A',
  inputBg: '#1E2A38',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37'
};

export default function RealtimeChat({
  salaId,
  currentUserEmail,
  currentUserRole,
  currentUserName,
  contraparteNombre,
  onClose
}) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const mensajesEndRef = useRef(null);

  const salaActiva = salaId || 'sala_general_tecco';
  const miIdentificador = (currentUserEmail || currentUserName || 'usuario_tecco').trim().toLowerCase();

  // Escucha en tiempo real de los mensajes de esta sala en Firebase Firestore
  useEffect(() => {
    setCargando(true);
    const q = query(
      collection(db, 'chats_mensajes'),
      where('salaId', '==', salaActiva)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data()
        }));

        // Ordenar cronológicamente en cliente para evitar problemas de índices compuestos
        lista.sort((a, b) => {
          const tiempoA = a.createdAtMs || (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0);
          const tiempoB = b.createdAtMs || (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0);
          return tiempoA - tiempoB;
        });

        setMensajes(lista);
        setCargando(false);
      },
      (error) => {
        console.error('Error escuchando mensajes en tiempo real:', error);
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [salaActiva]);

  // Desplazamiento automático hacia el último mensaje
  useEffect(() => {
    if (mensajesEndRef.current) {
      mensajesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    const textoLimpio = nuevoMensaje.trim();
    if (!textoLimpio || enviando) return;

    setEnviando(true);
    setNuevoMensaje('');

    try {
      await addDoc(collection(db, 'chats_mensajes'), {
        salaId: salaActiva,
        texto: textoLimpio,
        remitenteEmail: miIdentificador,
        remitenteNombre: currentUserName || 'Usuario',
        remitenteRol: currentUserRole || 'cliente',
        createdAtMs: Date.now(),
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setNuevoMensaje(textoLimpio);
      alert('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const formatearHora = (msg) => {
    try {
      const dateObj = msg.timestamp?.toDate
        ? msg.timestamp.toDate()
        : msg.createdAtMs
        ? new Date(msg.createdAtMs)
        : new Date();
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.chatBg,
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        color: COLORS.textMain
      }}
    >
      {/* Cabecera estilo WhatsApp */}
      <div
        style={{
          backgroundColor: COLORS.headerBg,
          padding: '12px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.primary,
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ←
          </button>

          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#1E2D38',
              color: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '15px'
            }}
          >
            {(contraparteNombre || 'E').charAt(0).toUpperCase()}
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: COLORS.textMain }}>
              {contraparteNombre || 'Especialista TECCO'}
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: COLORS.primary }}>
              En línea · Chat en tiempo real
            </p>
          </div>
        </div>
      </div>

      {/* Área de mensajes con desplazamiento táctil y con flechas */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          touchAction: 'pan-y'
        }}
      >
        {cargando ? (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '13px', marginTop: '20px' }}>
            Conectando conversación...
          </p>
        ) : mensajes.length === 0 ? (
          <div
            style={{
              alignSelf: 'center',
              backgroundColor: COLORS.headerBg,
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1px solid ${COLORS.border}`,
              marginTop: '12px',
              textAlign: 'center'
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSecondary }}>
              Inicia la conversación con {contraparteNombre || 'el especialista'} para coordinar el servicio.
            </p>
          </div>
        ) : (
          mensajes.map((msg) => {
            const esMio =
              msg.remitenteEmail === miIdentificador ||
              (msg.remitenteRol === currentUserRole && msg.remitenteNombre === currentUserName);

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: esMio ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  backgroundColor: esMio ? COLORS.bubbleMine : COLORS.bubbleOther,
                  padding: '9px 12px',
                  borderRadius: esMio ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
                  wordBreak: 'break-word'
                }}
              >
                {!esMio && (
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.primary, marginBottom: '2px' }}>
                    {msg.remitenteNombre || contraparteNombre}
                  </div>
                )}
                <div style={{ fontSize: '14px', lineHeight: '1.4', color: COLORS.textMain }}>
                  {msg.texto}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.65)',
                    textAlign: 'right',
                    marginTop: '4px'
                  }}
                >
                  {formatearHora(msg)}
                </div>
              </div>
            );
          })
        )}
        <div ref={mensajesEndRef} />
      </div>

      {/* Barra inferior para escribir y enviar */}
      <form
        onSubmit={handleEnviarMensaje}
        style={{
          backgroundColor: COLORS.headerBg,
          padding: '10px 14px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.inputBg,
            color: COLORS.textMain,
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={!nuevoMensaje.trim() || enviando}
          style={{
            backgroundColor: nuevoMensaje.trim() ? COLORS.primary : '#222D37',
            color: nuevoMensaje.trim() ? '#000000' : COLORS.textSecondary,
            border: 'none',
            padding: '12px 18px',
            borderRadius: '24px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: nuevoMensaje.trim() ? 'pointer' : 'default'
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}