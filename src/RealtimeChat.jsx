import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';

const COLORS = {
  primary: '#00A887',
  background: '#0B131A',
  card: '#16222D',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37',
  bubbleOwn: '#005C4B',
  bubbleOther: '#1F2C34'
};

export default function RealtimeChat({
  salaId,
  currentUserEmail,
  currentUserRole,
  currentUserName,
  contraparteNombre,
  contraparteEmail,
  onClose
}) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef(null);

  const emailPropio = (currentUserEmail || '').trim().toLowerCase();
  const emailOtro = (contraparteEmail || '').trim().toLowerCase();

  useEffect(() => {
    if (!salaId) return;

    const q = query(
      collection(db, 'chats_mensajes'),
      where('salaId', '==', salaId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data()
        }));

        lista.sort((a, b) => {
          const tA = a.timestampMs || (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
          const tB = b.timestampMs || (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
          return tA - tB;
        });

        setMensajes(lista);
      },
      (error) => {
        console.error('Error escuchando mensajes del chat:', error);
      }
    );

    return () => unsubscribe();
  }, [salaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    const textoLimpio = nuevoMensaje.trim();
    if (!textoLimpio || !salaId || enviando) return;

    setEnviando(true);
    setNuevoMensaje('');
    const ahoraMs = Date.now();

    try {
      await addDoc(collection(db, 'chats_mensajes'), {
        salaId,
        texto: textoLimpio,
        remitenteEmail: emailPropio,
        remitenteNombre: currentUserName || 'Usuario TECCO',
        remitenteRol: currentUserRole || 'cliente',
        destinatarioEmail: emailOtro,
        destinatarioNombre: contraparteNombre || 'Contacto TECCO',
        timestampMs: ahoraMs,
        createdAt: serverTimestamp()
      });

      const esTrabajador = currentUserRole === 'trabajador';
      const clienteEmail = esTrabajador ? emailOtro : emailPropio;
      const clienteNombre = esTrabajador ? (contraparteNombre || 'Cliente') : (currentUserName || 'Cliente');
      const trabajadorEmail = esTrabajador ? emailPropio : emailOtro;
      const trabajadorNombre = esTrabajador ? (currentUserName || 'Especialista') : (contraparteNombre || 'Especialista');

      await setDoc(
        doc(db, 'chats_salas', salaId),
        {
          salaId,
          clienteEmail,
          clienteNombre,
          trabajadorEmail,
          trabajadorNombre,
          participantes: [clienteEmail, trabajadorEmail].filter(Boolean),
          ultimoMensaje: textoLimpio,
          actualizadoEnMs: ahoraMs,
          actualizadoEn: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setNuevoMensaje(textoLimpio);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        color: COLORS.textMain
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          backgroundColor: COLORS.card,
          padding: '14px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
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
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: COLORS.textMain }}>
              {contraparteNombre || 'Conversación'}
            </h3>
            <span style={{ fontSize: '11px', color: COLORS.primary }}>Chat en tiempo real</span>
          </div>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '640px',
          width: '100%',
          margin: '0 auto'
        }}
      >
        {mensajes.length === 0 ? (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '13px', marginTop: '30px' }}>
            Inicia la conversación enviando un mensaje.
          </p>
        ) : (
          mensajes.map((msg) => {
            const esMio = (msg.remitenteEmail || '').toLowerCase() === emailPropio;
            const hora = msg.timestampMs
              ? new Date(msg.timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: esMio ? 'flex-end' : 'flex-start',
                  backgroundColor: esMio ? COLORS.bubbleOwn : COLORS.bubbleOther,
                  color: COLORS.textMain,
                  padding: '10px 14px',
                  borderRadius: '14px',
                  maxWidth: '78%',
                  border: `1px solid ${COLORS.border}`
                }}
              >
                {!esMio && (
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.primary, marginBottom: '3px' }}>
                    {msg.remitenteNombre || contraparteNombre}
                  </div>
                )}
                <div style={{ fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.texto}</div>
                {hora && (
                  <div style={{ fontSize: '10px', color: COLORS.textSecondary, textAlign: 'right', marginTop: '4px' }}>
                    {hora}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Barra de envío */}
      <form
        onSubmit={handleEnviarMensaje}
        style={{
          backgroundColor: COLORS.card,
          padding: '12px 16px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          gap: '10px',
          position: 'sticky',
          bottom: 0
        }}
      >
        <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.background,
              color: COLORS.textMain,
              fontSize: '13px'
            }}
          />
          <button
            type="submit"
            disabled={enviando || !nuevoMensaje.trim()}
            style={{
              backgroundColor: COLORS.primary,
              color: '#000000',
              border: 'none',
              padding: '12px 18px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}