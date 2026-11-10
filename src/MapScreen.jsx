import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLORS = {
  primary: '#00A887',
  secondary: '#1E2A38',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textSecondary: '#718096',
  border: '#EDF2F7',
};

// Pantalla Principal de Lista y Banner de Mapa
export default function MapScreen({ navigation }) {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "trabajadores"));
        const lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });
        setTrabajadores(lista);
      } catch (e) {
        console.log("Error cargando de Firebase:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrabajadores();
  }, []);

  return (
    <div style={{ padding: '16px', backgroundColor: COLORS.background, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Barra superior con Botón de Regresar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <button 
            onClick={() => navigation.navigate('Home')}
            style={{ backgroundColor: '#00A887', width: '36px', height: '36px', borderRadius: '50%', border: 'none', color: '#FFF', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: COLORS.secondary, margin: 0 }}>📍 Colaboradores en Mapa</h2>
            <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: 0 }}>Solidaridad, Quintana Roo</p>
          </div>
        </div>

        <div
          onClick={() => navigation.navigate('FullMap', { trabajadores })}
          style={{ display: 'flex', backgroundColor: COLORS.card, padding: '16px', borderRadius: '16px', alignItems: 'center', marginBottom: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #EDF2F7' }}
        >
          <span style={{ fontSize: '32px' }}>🗺️</span>
          <div style={{ flex: 1, marginLeft: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.secondary, margin: '0 0 4px 0' }}>Ver Mapa General.</h3>
            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Toca aquí para ver a mas colaboradores disponibles.</p>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: COLORS.primary, marginTop: '30px', fontWeight: 'bold' }}>Cargando colaboradores...</p>
        ) : trabajadores.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.secondary, margin: 0 }}>📭 No hay trabajadores en este radio todavía.</p>
            <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>Los registros nuevos desde Firebase aparecerán aquí.</p>
          </div>
        ) : (
          trabajadores.map((item) => (
            <div key={item.id} style={{ backgroundColor: COLORS.card, padding: '16px', borderRadius: '16px', marginBottom: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.secondary, margin: 0 }}>{item.nombre}</h3>
                <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', backgroundColor: item.disponible ? '#E6F6F3' : '#FFEBEV', color: item.disponible ? COLORS.primary : '#D32F2F' }}>
                  {item.disponible ? '🟢 Disponible' : '🔴 Ocupado'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: '0 0 4px 0' }}>{item.oficio} · Col. {item.colonia}</p>
              <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 8px 0' }}>📞 {item.telefono}</p>

              {item.suscripcionActiva && (
                <p style={{ fontSize: '11px', color: '#D69E2E', fontWeight: 'bold', margin: '0 0 10px 0' }}>⭐ Miembro TECCO PRO (Prueba Activa)</p>
              )}

              <button
                style={{ width: '100%', backgroundColor: COLORS.primary, color: '#FFF', padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => navigation.navigate('RequestService', { worker: item })}
              >
                Solicitar Cotización
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Pantalla del Mapa General con Leaflet y Pines en Tiempo Real
export function FullMapScreen({ route, navigation }) {
  const { trabajadores = [] } = route.params || {};

  const generateMapHtml = () => {
    const markersScript = trabajadores.map(t => {
      const lat = t.lat || 20.6296;
      const lon = t.lon || -87.0739;
      const nombre = t.nombre || 'Técnico';
      const oficio = t.oficio || 'Especialista';
      const colonia = t.colonia || 'Playa del Carmen';
      const disponibilidad = t.disponible ? '🟢 Disponible' : '🔴 Ocupado';

      return `
        L.marker([${lat}, ${lon}])
          .addTo(map)
          .bindPopup('<b>${nombre}</b><br>${oficio}<br>Col. ${colonia}<br><small>${disponibilidad}</small>');
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
        .leaflet-control-attribution { display: none !important; }
      </style>
      </head>
      <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([20.6296, -87.0739], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // PINES DINÁMICOS DE FIREBASE
        ${markersScript}
      </script>
      </body>
      </html>
    `;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: COLORS.background, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Cabecera del Mapa General con Botón de Regresar */}
      <div style={{ backgroundColor: COLORS.secondary, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => navigation.navigate('Map')}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '32px', height: '32px', borderRadius: '50%', border: 'none', color: '#FFF', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#FFF', fontWeight: 'bold', fontSize: '13px', margin: 0 }}>📍 Cobertura Playa del Carmen (10 km)</h3>
          <p style={{ color: '#A0AEC0', fontSize: '11px', margin: 0 }}>Técnicos activos registrados en TECCO: {trabajadores.length}</p>
        </div>
      </div>

      <div style={{ height: '40vh', width: '100%' }}>
        <iframe
          title="Mapa de Playa del Carmen Dinámico"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          srcDoc={generateMapHtml()}
        />
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', maxWidth: '600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.secondary, marginBottom: '10px' }}>
          Pines de Técnicos Cercanos ({trabajadores.length}):
        </h3>

        {trabajadores.map((t) => (
          <div key={t.id} style={{ display: 'flex', backgroundColor: COLORS.card, padding: '12px', borderRadius: '12px', alignItems: 'center', marginBottom: '10px', border: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: '20px', marginRight: '10px' }}>📍</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 'bold', color: COLORS.secondary, margin: '0 0 2px 0', fontSize: '14px' }}>{t.nombre} ({t.oficio})</h4>
              <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Colonia: {t.colonia} · {t.disponible ? '🟢 Disponible' : '🔴 Ocupado'}</p>
            </div>
            <button
              style={{ backgroundColor: COLORS.primary, border: 'none', padding: '8px 12px', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => navigation.navigate('RequestService', { worker: t })}
            >
              Cotizar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}