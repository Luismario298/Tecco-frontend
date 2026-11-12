import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function WorkerRequestsPanel({ workerEmail, workerName, onBack, onOpenChat }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Escucha en tiempo real las solicitudes dirigidas a este colaborador
    const q = query(collection(db, 'solicitudes_servicio'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
      }));
      
      // Filtramos por nombre o email del trabajador (si aplica) o mostramos las activas
      const filtradas = workerName 
        ? lista.filter(s => s.destinatario === workerName || !s.destinatario)
        : lista;

      setSolicitudes(filtradas);
      setCargando(false);
    }, (error) => {
      console.error("Error escuchando solicitudes:", error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [workerName, workerEmail]);

  const confirmarSolicitud = async (solicitudId) => {
    try {
      const solicitudRef = doc(db, 'solicitudes_servicio', solicitudId);
      await updateDoc(solicitudRef, {
        estado: 'Confirmado'
      });
      alert('✅ ¡Solicitud confirmada! El cliente ha sido notificado.');
    } catch (error) {
      console.error("Error al confirmar solicitud:", error);
      alert('No se pudo confirmar la solicitud.');
    }
  };

  const completarSolicitud = async (solicitudId) => {
    try {
      const solicitudRef = doc(db, 'solicitudes_servicio', solicitudId);
      await updateDoc(solicitudRef, {
        estado: 'Completado'
      });
      alert('🎉 ¡Trabajo marcado como Completado!');
    } catch (error) {
      console.error("Error al completar solicitud:", error);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, Poppins, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Cabecera */}
        <div style={{ backgroundColor: '#1E2A38', color: '#FFFFFF', padding: '14px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <button 
            onClick={onBack}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', width: '34px', height: '34px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: '700' }}>📥 Solicitudes de Trabajo Recibidas</h2>
            <p style={{ fontSize: '11px', margin: 0, opacity: 0.8 }}>Panel Colaborador · {workerName || 'Especialista TECCO'}</p>
          </div>
        </div>

        {/* Listado de Solicitudes */}
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>Sincronizando solicitudes en tiempo real...</p>
        ) : solicitudes.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '16px', textAlign: 'center', border: '1px solid #EDF2F7' }}>
            <span style={{ fontSize: '36px' }}>📭</span>
            <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '10px 0 4px 0' }}>Sin solicitudes pendientes</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>Cuando un cliente pida tus servicios aparecerá aquí al instante.</p>
          </div>
        ) : (
          solicitudes.map((sol) => (
            <div key={sol.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #EDF2F7' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E2A38' }}>
                  👤 Cliente: {sol.cliente_email || 'Usuario TECCO'}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold', 
                  padding: '4px 10px', 
                  borderRadius: '10px',
                  backgroundColor: sol.estado === 'Confirmado' ? '#E6F6F3' : sol.estado === 'Completado' ? '#EDF2F7' : '#FEFCBF',
                  color: sol.estado === 'Confirmado' ? '#00A887' : sol.estado === 'Completado' ? '#4A5568' : '#B7791F'
                }}>
                  {sol.estado || 'Pendiente'}
                </span>
              </div>

              <div style={{ backgroundColor: '#F8F9FA', padding: '12px', borderRadius: '12px', marginBottom: '12px', fontSize: '13px', color: '#2D3748' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>🛠️ Falla / Servicio:</strong> {sol.detalles_falla}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>📍 <strong>Zona:</strong> {sol.zona}</p>
              </div>

              {/* Botones de Acción: Confirmación y Chat en Vivo */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {sol.estado !== 'Confirmado' && sol.estado !== 'Completado' && (
                  <button 
                    onClick={() => confirmarSolicitud(sol.id)}
                    style={{ flex: 1, backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,168,135,0.2)' }}
                  >
                    ✅ Confirmar Trabajo
                  </button>
                )}

                {sol.estado === 'Confirmado' && (
                  <button 
                    onClick={() => completarSolicitud(sol.id)}
                    style={{ flex: 1, backgroundColor: '#3182CE', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    🏁 Marcar Completado
                  </button>
                )}

                <button 
                  onClick={() => onOpenChat({ 
                    salaId: sol.id, 
                    nombreContraparte: sol.cliente_email || 'Cliente',
                    oficio: sol.detalles_falla 
                  })}
                  style={{ flex: 1, backgroundColor: '#1A202C', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  💬 Chat con Cliente
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}