import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function WorkerProfile({ workerEmail, workerName, onBack }) {
  const [perfil, setPerfil] = useState({
    oficio: 'Aire Acondicionado',
    colonia: 'Villas del Sol',
    telefono: '',
    anosExperiencia: '3 años'
  });
  const [solicitudesClientes, setSolicitudesClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);

  // Cargar datos del trabajador y sus solicitudes de clientes desde Firebase
  useEffect(() => {
    const cargarDatosTrabajador = async () => {
      try {
        // 1. Buscar perfil del trabajador
        const qTrabajador = query(collection(db, 'trabajadores'), where('email', '==', workerEmail));
        const snapTrabajador = await getDocs(qTrabajador);
        
        if (!snapTrabajador.empty) {
          const docData = snapTrabajador.docs[0].data();
          setPerfil({
            id: snapTrabajador.docs[0].id,
            oficio: docData.oficio || 'Aire Acondicionado',
            colonia: docData.colonia || 'Villas del Sol',
            telefono: docData.telefono || '',
            anosExperiencia: docData.anosExperiencia || '3 años',
            nombre: docData.nombre || workerName
          });
        }

        // 2. Buscar solicitudes de servicios enviadas por los clientes
        const qSolicitudes = query(collection(db, 'solicitudes_servicio'), where('destinatario', '==', workerName || ''));
        const snapSolicitudes = await getDocs(qSolicitudes);
        const listaSolicitudes = snapSolicitudes.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));

        setSolicitudesClientes(listaSolicitudes);
      } catch (error) {
        console.error("Error al cargar perfil del trabajador:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosTrabajador();
  }, [workerEmail, workerName]);

  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    try {
      if (perfil.id) {
        const refDoc = doc(db, 'trabajadores', perfil.id);
        await updateDoc(refDoc, {
          oficio: perfil.oficio,
          colonia: perfil.colonia,
          telefono: perfil.telefono,
          anosExperiencia: perfil.anosExperiencia
        });
        alert('¡Perfil actualizado con éxito!');
        setEditando(false);
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert('Hubo un error al actualizar el perfil.');
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '20px', fontFamily: 'Inter, Poppins, sans-serif', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: '#00A887' }}>← Volver</button>
        <h2 style={{ fontSize: '16px', color: '#1E2A38', margin: 0, fontWeight: '700' }}>🛠️ Panel de Colaborador</h2>
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>Cargando información...</p>
      ) : (
        <>
          {/* Sección de Modificación de Perfil */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #EDF2F7', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', color: '#1E2A38', margin: 0, fontWeight: '700' }}>Mi Información Profesional</h3>
              <button onClick={() => setEditando(!editando)} style={{ backgroundColor: '#E6F6F3', color: '#00A887', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {editando ? 'Cancelar' : '✏️ Editar'}
              </button>
            </div>

            {editando ? (
              <form onSubmit={handleActualizarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#4A5568', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Oficio</label>
                  <select value={perfil.oficio} onChange={(e) => setPerfil({...perfil, oficio: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA' }}>
                    <option value="Aire Acondicionado">Aire Acondicionado</option>
                    <option value="Plomero">Plomero</option>
                    <option value="Electricista">Electricista</option>
                    <option value="Carpintero">Carpintero</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4A5568', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Colonia / Zona</label>
                  <select value={perfil.colonia} onChange={(e) => setPerfil({...perfil, colonia: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA' }}>
                    <option value="Villas del Sol">Villas del Sol</option>
                    <option value="Centro">Centro</option>
                    <option value="Ejido">Ejido</option>
                    <option value="Colosio">Colosio</option>
                    <option value="Zama">Zama</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#4A5568', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Teléfono</label>
                  <input type="text" value={perfil.telefono} onChange={(e) => setPerfil({...perfil, telefono: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" style={{ backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>Guardar Cambios</button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#2D3748' }}>
                <p style={{ margin: 0 }}><strong>Nombre:</strong> {perfil.nombre}</p>
                <p style={{ margin: 0 }}><strong>Oficio:</strong> {perfil.oficio}</p>
                <p style={{ margin: 0 }}><strong>Zona:</strong> {perfil.colonia}</p>
                <p style={{ margin: 0 }}><strong>Teléfono:</strong> {perfil.telefono || 'No registrado'}</p>
              </div>
            )}
          </div>

          {/* Sección de Comunicación con Clientes (Solicitudes recibidas) */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '15px', color: '#1E2A38', margin: '0 0 12px 0', fontWeight: '700' }}>💬 Solicitudes y Mensajes de Clientes</h3>
            
            {solicitudesClientes.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#718096', textAlign: 'center', padding: '15px 0' }}>No tienes solicitudes de servicio pendientes.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {solicitudesClientes.map((sol, idx) => (
                  <div key={idx} style={{ backgroundColor: '#F8F9FA', borderRadius: '12px', padding: '12px', border: '1px solid #EDF2F7' }}>
                    <p style={{ fontSize: '12px', color: '#00A887', fontWeight: 'bold', margin: '0 0 4px 0' }}>Cliente: {sol.cliente_email}</p>
                    <p style={{ fontSize: '13px', color: '#1E2A38', margin: '0 0 6px 0' }}><strong>Falla:</strong> {sol.detalles_falla}</p>
                    <p style={{ fontSize: '11px', color: '#718096', margin: 0 }}>📍 Zona: {sol.zona} | Estado: <span style={{ color: '#48BB78', fontWeight: 'bold' }}>{sol.estado}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}