import React from 'react';
import logoTecco from './logo.png';

export default function HomeSection({ userRole, userName, onNavigate }) {
  return (
    <div style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', padding: '24px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Cabecera de bienvenida */}
      <div style={{ backgroundColor: '#00A887', color: '#FFFFFF', padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.25)', marginBottom: '24px' }}>
        <img src={logoTecco} alt="TECCO" style={{ width: '50px', height: '50px', objectFit: 'contain', backgroundColor: '#FFF', borderRadius: '12px', padding: '6px' }} />
        <div>
          <h2 style={{ fontSize: '20px', margin: '0 0 4px 0', fontWeight: '700' }}>¡Hola, {userName || 'Usuario'}!</h2>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>Rol: {userRole === 'trabajador' ? '🛠️ Colaborador' : '🏠 Cliente'} • Playa del Carmen</p>
        </div>
      </div>

      {/* Tarjeta de Acceso Rápido */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '0 0 12px 0', fontWeight: 'bold' }}>Panel Principal</h3>
        <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', margin: '0 0 16px 0' }}>
          {userRole === 'trabajador' 
            ? 'Gestiona tus fotos de portafolio, recibe solicitudes locales y revisa tus calificaciones.'
            : 'Encuentra especialistas geolocalizados, solicita servicios técnicos y califica la atención recibida.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => onNavigate('Map')}
            style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0, 168, 135, 0.2)' }}
          >
            🔍 Ver Directorio de Especialistas
          </button>

          {userRole === 'trabajador' && (
            <button
              onClick={() => onNavigate('UploadPortfolio')}
              style={{ backgroundColor: '#1E2A38', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📷 Subir Fotos al Portafolio
            </button>
          )}
        </div>
      </div>

      {/* Información de la zona */}
      <div style={{ backgroundColor: '#E6F6F3', border: '1px solid #D0EBE5', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px' }}>📍</span>
        <h4 style={{ fontSize: '14px', color: '#1E2A38', margin: '6px 0 4px 0', fontWeight: 'bold' }}>Cobertura Activa</h4>
        <p style={{ fontSize: '12px', color: '#4A5568', margin: 0 }}>Villas del Sol, Centro, Ejido, Colosio y Zama.</p>
      </div>

    </div>
  );
}