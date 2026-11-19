import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLORS = {
  primary: '#00A887',
  secondary: '#1E2A38',
  background: '#0B131A',
  card: '#16222D',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37'
};

// Componente único de Mapa Interactivo embebido (sin cabeceras duplicadas)
export function FullMapScreen({ route, navigation, embedded = true }) {
  const { trabajadores = [] } = route?.params || {};

  const generateMapHtml = () => {
    const markersScript = trabajadores.map(t => {
      const lat = t.lat || 20.6296;
      const lon = t.lon || -87.0739;
      const nombre = (t.nombre || 'Técnico').replace(/'/g, "\\'");
      const oficio = (t.oficio || 'Especialista').replace(/'/g, "\\'");
      const colonia = (t.colonia || 'Playa del Carmen').replace(/'/g, "\\'");
      const disponibilidad = t.disponible ? 'Disponible' : 'Ocupado';

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
        html, body, #map { height: 100%; margin: 0; padding: 0; background-color: #0B131A; }
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

        ${markersScript}
      </script>
      </body>
      </html>
    `;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: COLORS.background, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Solo muestra botón de regreso si se abre fuera de la pestaña integrada */}
      {!embedded && (
        <div style={{ backgroundColor: COLORS.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${COLORS.border}` }}>
          <button 
            onClick={() => navigation.navigate('Home')}
            style={{ backgroundColor: COLORS.background, width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, color: COLORS.textMain, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: COLORS.textMain, fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Cobertura Playa del Carmen (10 km)</h3>
            <p style={{ color: COLORS.textSecondary, fontSize: '11px', margin: 0 }}>Especialistas activos: {trabajadores.length}</p>
          </div>
        </div>
      )}

      {/* Contenedor único del Mapa */}
      <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
        <iframe
          title="Mapa de Playa del Carmen"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          srcDoc={generateMapHtml()}
        />
      </div>
    </div>
  );
}

export default function MapScreen({ navigation }) {
  const [trabajadores, setTrabajadores] = useState([]);

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
      }
    };
    fetchTrabajadores();
  }, []);

  return <FullMapScreen route={{ params: { trabajadores } }} navigation={navigation} embedded={false} />;
}