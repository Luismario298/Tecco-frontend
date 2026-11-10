import React, { useState } from 'react';
import logoTecco from './logo.png';

export default function WorkerDirectory({ 
  role, 
  trabajadores, 
  cargandoDatos, 
  onNavigate, 
  onSelectWorker, 
  onOpenChat 
}) {
  const [filtroOficio, setFiltroOficio] = useState('TODOS');

  const trabajadoresFiltrados = filtroOficio === 'TODOS' 
    ? trabajadores 
    : trabajadores.filter(t => t.oficio === filtroOficio);

  return (
    <div style={{ fontFamily: 'Inter, Poppins, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '16px' }}>
      
      {/* Barra superior con Botón de Regresar */}
      <header style={{ backgroundColor: '#00A887', color: '#ffffff', padding: '14px 18px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botón de Regresar incorporado */}
          <button 
            onClick={() => onNavigate('RoleSelection')} 
            style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', color: '#FFF', width: '32px', height: '32px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Regresar a selección de rol"
          >
            ←
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onNavigate('Home')}>
            <img src={logoTecco} alt="Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: '15px', margin: 0, fontWeight: '700' }}>TECCO ({role ? role.toUpperCase() : 'CLIENTE'})</h1>
              <p style={{ fontSize: '10px', margin: 0, opacity: 0.9 }}>📍 Playa del Carmen</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onNavigate('Map')} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🗺️ Mapa</button>
          
          {role === 'trabajador' && (
            <button onClick={() => onNavigate('WorkerProfile')} style={{ backgroundColor: '#1A202C', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>⚙️ Mi Panel</button>
          )}

          <button onClick={() => onNavigate('RoleSelection')} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Rol</button>
        </div>
      </header>

      {/* Categorías / Filtros */}
      <div style={{ display: 'flex', gap: '8px', margin: '16px 0', overflowX: 'auto', paddingBottom: '4px' }}>
        {['TODOS', 'Aire Acondicionado', 'Plomero', 'Electricista', 'Carpintero'].map((oficioItem) => (
          <button
            key={oficioItem}
            onClick={() => setFiltroOficio(oficioItem)}
            style={{
              backgroundColor: filtroOficio === oficioItem ? '#00A887' : '#FFFFFF',
              color: filtroOficio === oficioItem ? '#FFFFFF' : '#4A5568',
              border: filtroOficio === oficioItem ? 'none' : '1px solid #E2E8F0',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: filtroOficio === oficioItem ? '0 2px 6px rgba(0, 168, 135, 0.25)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {oficioItem}
          </button>
        ))}
      </div>

      {/* Listado de perfiles estilo Tarjeta Rappi */}
      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        {cargandoDatos ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>Buscando especialistas cerca...</p>
        ) : trabajadoresFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>No hay profesionales disponibles en esta categoría.</p>
        ) : (
          trabajadoresFiltrados.map((item) => (
            <div key={item.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #EDF2F7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#00A887', fontWeight: 'bold', backgroundColor: '#E6F6F3', padding: '2px 8px', borderRadius: '6px' }}>{item.oficio}</span>
                  <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '6px 0 2px 0', fontWeight: '700' }}>{item.nombre}</h3>
                  <p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>📍 Zona: {item.colonia || 'Villas del sol'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#D69E2E' }}>★ {item.rating || '5.0'}</span>
                  <p style={{ fontSize: '11px', color: '#718096', margin: '2px 0 0 0' }}>{item.anosExperiencia || '3 años'} exp.</p>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button onClick={() => onSelectWorker(item)} style={{ flex: 1, backgroundColor: '#F7FAFC', color: '#2D3748', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🔍 Ver Perfil</button>
                
                {role === 'cliente' && (
                  <button onClick={() => onNavigate('SolicitarTrabajo', { worker: item })} style={{ flex: 1, backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 6px rgba(0,168,135,0.2)' }}>🛠️ Pedir Servicio</button>
                )}

                <button onClick={() => onOpenChat(item)} style={{ width: '100%', backgroundColor: '#1A202C', color: '#FFF', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>💬 Chat en Vivo</button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}