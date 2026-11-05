import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import logoTecco from './logo.png';
import RateService from './RateService'; // Módulo de calificación y reseñas conectado a Firestore

export default function App() {
  const [pantalla, setPantalla] = useState('loading');
  const [routeParams, setRouteParams] = useState({ role: 'cliente', initialMode: 'login' });

  // RF-01: Estados de Autenticación y Registro
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // RF-02 y RF-03: Perfil Profesional, Portafolio y Coordenadas GPS
  const [oficio, setOficio] = useState("Aire Acondicionado");
  const [anosExperiencia, setAnosExperiencia] = useState("3 años");
  const [fotosTrabajos, setFotosTrabajos] = useState("");
  const [colonia, setColonia] = useState("Villas del Sol");
  const [telefono, setTelefono] = useState("");
  const [lat, setLat] = useState(20.630143);
  const [lon, setLon] = useState(-87.092946);

  // Estados de datos sincronizados con Firebase
  const [trabajadores, setTrabajadores] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [filtroOficio, setFiltroOficio] = useState('TODOS');
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  // RF-04: Estados del Chat y Negociación en Tiempo Real
  const [chatActivo, setChatActivo] = useState(false);
  const [mensajesChat, setMensajesChat] = useState([
    { remitente: 'sistema', texto: 'Canal de mensajería seguro conectado a Firebase para negociación de cotización.' }
  ]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [fotoFallaUrl, setFotoFallaUrl] = useState("");
  const [propuestaCotizacion, setPropuestaCotizacion] = useState("500");

  const navigation = {
    navigate: (screen, params = {}) => {
      if (params.role || params.nombre) {
        setRouteParams(prev => ({ ...prev, ...params }));
      }
      setPantalla(screen);
    }
  };

  const route = { params: routeParams };

  useEffect(() => {
    if (pantalla === 'loading') {
      const timer = setTimeout(() => {
        setPantalla('onboarding');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pantalla]);

  // Sincronización general con Firebase Firestore
  const cargarDatosFirestore = async () => {
    setCargandoDatos(true);
    try {
      const snapTrabajadores = await getDocs(collection(db, "trabajadores"));
      setTrabajadores(snapTrabajadores.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));

      const snapSolicitudes = await getDocs(collection(db, "solicitudes_servicio"));
      setSolicitudes(snapSolicitudes.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));

      setCargandoDatos(false);
    } catch (error) {
      console.error("Error al sincronizar con Firebase:", error);
      setCargandoDatos(false);
    }
  };

  // RF-01: Autenticación conectada a colecciones 'clientes' o redirección a registro técnico
  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && (!nombre || !confirmPassword))) {
      alert('Campos incompletos: Por favor llena todos los campos obligatorios.');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      alert('Error: Las contraseñas no coinciden.');
      return;
    }

    try {
      if (isLogin) {
        alert(`¡Bienvenido de nuevo! Has iniciado sesión como ${route.params.role}.`);
        await cargarDatosFirestore();
        setPantalla('Map');
      } else {
        if (route.params.role === 'trabajador') {
          navigation.navigate('RegisterTechnical', { nombre, email });
        } else {
          await addDoc(collection(db, 'clientes'), {
            nombre: nombre,
            email: email,
            rol: 'cliente',
            fecha_registro: serverTimestamp()
          });
          alert('¡Cuenta de cliente creada y registrada en Firebase!');
          await cargarDatosFirestore();
          setPantalla('Map');
        }
      }
    } catch (error) {
      console.error("Error en autenticación RF-01:", error);
    }
  };

  // RF-02 y RF-03: Guardado en la colección 'trabajadores'
  const handleRegisterTechnicalSubmit = async (e) => {
    e.preventDefault();
    try {
      const fotoUrlFinal = fotosTrabajos || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500";
      
      await addDoc(collection(db, 'trabajadores'), {
        nombre: route.params.nombre || nombre,
        email: route.params.email || email,
        oficio: oficio,
        anosExperiencia: anosExperiencia,
        fotosTrabajos: fotoUrlFinal,
        colonia: colonia,
        telefono: telefono,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        disponible: true,
        rating: "5.0",
        suscripcionActiva: true,
        createdAt: new Date().toISOString()
      });

      alert('¡Perfil profesional guardado exitosamente en la base de datos de Firebase!');
      await cargarDatosFirestore();
      setPantalla('Map');
    } catch (error) {
      console.error("Error al registrar trabajador en Firebase:", error);
    }
  };

  // RF-04: Envío de mensajes y cotizaciones a Firebase
  const enviarMensajeChat = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() && !fotoFallaUrl) return;

    const listaActualizada = [...mensajesChat, { remitente: 'usuario', texto: nuevoMensaje, foto: fotoFallaUrl }];
    setMensajesChat(listaActualizada);
    setNuevoMensaje("");
    setFotoFallaUrl("");

    try {
      if (perfilSeleccionado) {
        await addDoc(collection(db, 'solicitudes_servicio'), {
          destinatario: perfilSeleccionado.nombre,
          detalles_falla: nuevoMensaje || "Negociación de servicio",
          estado: "En proceso",
          zona: perfilSeleccionado.colonia,
          cotizacion: `$${propuestaCotizacion} MXN`,
          fecha_creacion: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error al registrar solicitud en Firebase:", err);
    }

    setTimeout(() => {
      setMensajesChat(prev => [
        ...prev, 
        { remitente: 'profesional', texto: `Cotización ajustada a $${propuestaCotizacion} MXN aceptada para iniciar la labor.` }
      ]);
    }, 1200);
  };

  // Si se selecciona la pantalla de calificación, mostramos el componente externo RateService
  if (pantalla === 'RateService') {
    return (
      <RateService 
        workerId={perfilSeleccionado?.id} 
        workerName={perfilSeleccionado?.nombre} 
        onBack={() => setPantalla('Map')} 
      />
    );
  }

  // 1. PANTALLA: LOADING
  if (pantalla === 'loading') {
    return (
      <div style={{ backgroundColor: '#00A887', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#FFFFFF', fontFamily: 'Poppins, Inter, sans-serif' }}>
        <img src={logoTecco} alt="TECCO Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '20px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }} />
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '700' }}>TECCO</h1>
        <p style={{ fontSize: '14px', letterSpacing: '2px', opacity: 0.9, margin: 0 }}>PLAYA DEL CARMEN</p>
      </div>
    );
  }

  // 2. PANTALLA: ONBOARDING
  if (pantalla === 'onboarding') {
    return (
      <div style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 24px', boxSizing: 'border-box', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '450px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ width: '150px', height: '150px', borderRadius: '24px', backgroundColor: '#00A887', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 25px rgba(0, 168, 135, 0.25)', padding: '15px' }}>
            <img src={logoTecco} alt="TECCO" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '26px', color: '#1E2A38', margin: '0 0 12px 0', fontWeight: '700' }}>Servicios Técnicos</h2>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.5', margin: 0 }}>Plataforma geolocalizada para trabajadores y gestión de servicios en Playa del Carmen.</p>
        </div>

        <button
          onClick={() => setPantalla('RoleSelection')}
          style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.3)' }}
        >
          Comenzar &gt;
        </button>
      </div>
    );
  }

  // 3. PANTALLA: SELECCIÓN DE ROL
  if (pantalla === 'RoleSelection') {
    return (
      <div style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', padding: '40px 20px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoTecco} alt="TECCO" style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '10px' }} />
          <h2 style={{ fontSize: '24px', color: '#1E2A38', fontWeight: '700', margin: '0 0 8px 0' }}>¿Cómo deseas ingresar?</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Selecciona tu perfil en TECCO</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            onClick={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })}
            style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid #E0E0E0' }}
          >
            <span style={{ fontSize: '32px' }}>🏠</span>
            <div>
              <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '0 0 4px 0', fontWeight: 'bold' }}>Solicitar Servicio</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Encuentra especialistas cercanos a ti.</p>
            </div>
          </div>

          <div
            onClick={() => navigation.navigate('Auth', { role: 'trabajador', initialMode: 'login' })}
            style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid #E0E0E0' }}
          >
            <span style={{ fontSize: '32px' }}>🛠️</span>
            <div>
              <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '0 0 4px 0', fontWeight: 'bold' }}>Colaborador</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Ofrece tus servicios y recibe solicitudes locales.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. PANTALLA: AUTENTICACIÓN (RF-01)
  if (pantalla === 'Auth') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '30px 20px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '450px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src={logoTecco} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '22px', color: '#1E2A38', fontWeight: '700', margin: 0 }}>{isLogin ? 'Iniciar Sesión' : 'Registro de Cuenta'}</h2>
          <p style={{ fontSize: '13px', color: '#00A887', fontWeight: 'bold', marginTop: '4px' }}>
            {route.params.role === 'trabajador' ? '🛠️ Perfil Trabajador' : '🏠 Perfil Cliente'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Correo Electrónico</label>
            <input
              type="email"
              placeholder="correo@tecco.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box' }}
              />
              <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', fontWeight: 'bold', color: '#00A887', cursor: 'pointer' }}>
                {showPassword ? '🔒 Ocultar' : '👁️ Ver'}
              </span>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label style={{ fontSize: '13px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Confirmar Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box' }}
                />
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', fontWeight: 'bold', color: '#00A887', cursor: 'pointer' }}>
                  {showConfirmPassword ? '🔒 Ocultar' : '👁️ Ver'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 10px rgba(0, 168, 135, 0.25)' }}
          >
            {isLogin ? 'Entrar' : 'Registrarse y Continuar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <span onClick={() => setIsLogin(!isLogin)} style={{ fontSize: '13px', color: '#00A887', cursor: 'pointer', fontWeight: 'bold' }}>
              {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 5. PANTALLA: REGISTRO TÉCNICO (RF-02 y RF-03)
  if (pantalla === 'RegisterTechnical') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '30px 20px', fontFamily: 'Poppins, Inter, sans-serif', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src={logoTecco} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '6px' }} />
          <h2 style={{ fontSize: '20px', color: '#1E2A38', fontWeight: '700', margin: 0 }}>RF-02: Registro Profesional</h2>
          <p style={{ fontSize: '13px', color: '#00A887', fontWeight: 'bold', marginTop: '2px' }}>Portafolio y ubicación GPS para Firebase</p>
        </div>

        <form onSubmit={handleRegisterTechnicalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Oficio / Especialidad</label>
            <select
              value={oficio}
              onChange={(e) => setOficio(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', fontSize: '13px' }}
            >
              <option value="Aire Acondicionado">Aire Acondicionado</option>
              <option value="Plomero">Plomero</option>
              <option value="Electricista">Electricista</option>
              <option value="Carpintero">Carpintero</option>
              <option value="Albañil">Albañil</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Años de Experiencia</label>
            <input
              type="text"
              placeholder="Ej. 3 años"
              value={anosExperiencia}
              onChange={(e) => setAnosExperiencia(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>🖼️ Foto del Portafolio de Trabajos (URL)</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/photo-..."
              value={fotosTrabajos}
              onChange={(e) => setFotosTrabajos(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Colonia / Zona (Playa del Carmen)</label>
            <select
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', fontSize: '13px' }}
            >
              <option value="Villas del Sol">Villas del Sol</option>
              <option value="Centro">Centro</option>
              <option value="Ejido">Ejido</option>
              <option value="Colosio">Colosio</option>
              <option value="Zama">Zama</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>Teléfono de Contacto</label>
            <input
              type="text"
              placeholder="9841004581"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#F5F7FA', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>

          <div style={{ backgroundColor: '#F5F7FA', padding: '12px', borderRadius: '10px', border: '1px solid #E0E0E0' }}>
            <label style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>📍 Coordenadas GPS</label>
            <div 
              onClick={() => {
                setLat(parseFloat((20.6200 + Math.random() * 0.02).toFixed(6)));
                setLon(parseFloat((-87.0800 - Math.random() * 0.02).toFixed(6)));
              }}
              style={{ width: '100%', height: '60px', backgroundColor: '#E2E8F0', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '2px dashed #00A887' }}
            >
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#00A887' }}>🗺️ Capturar Coordenadas GPS</span>
            </div>
          </div>

          <button
            type="submit"
            style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', boxShadow: '0 4px 10px rgba(0, 168, 135, 0.25)' }}
          >
            Guardar Perfil y Publicar en Firebase
          </button>
        </form>
      </div>
    );
  }

  // 6. PANTALLA: DIRECTORIO GENERAL Y CHAT DE NEGOCIACIÓN (RF-04)
  const trabajadoresFiltrados = filtroOficio === 'TODOS' 
    ? trabajadores 
    : trabajadores.filter(t => t.oficio === filtroOficio);

  return (
    <div style={{ fontFamily: 'Inter, Poppins, sans-serif', backgroundColor: '#F5F7FA', minHeight: '100vh', padding: '16px' }}>
      <header style={{ backgroundColor: '#00A887', color: '#ffffff', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logoTecco} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '18px', margin: 0 }}>TECCO PWA ({route.params.role.toUpperCase()})</h1>
            <p style={{ fontSize: '11px', margin: 0, opacity: 0.9 }}>Playa del Carmen</p>
          </div>
        </div>
        <button 
          onClick={() => setPantalla('RoleSelection')}
          style={{ backgroundColor: 'transparent', border: '1px solid #FFF', color: '#FFF', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
        >
          Cambiar Rol
        </button>
      </header>

      {/* Filtros de Oficios */}
      <div style={{ display: 'flex', gap: '8px', margin: '20px 0', overflowX: 'auto', paddingBottom: '4px' }}>
        {['TODOS', 'Aire Acondicionado', 'Plomero', 'Electricista', 'Carpintero'].map((oficioItem) => (
          <button
            key={oficioItem}
            onClick={() => setFiltroOficio(oficioItem)}
            style={{
              backgroundColor: filtroOficio === oficioItem ? '#00A887' : '#FFFFFF',
              color: filtroOficio === oficioItem ? '#FFFFFF' : '#1E2A38',
              border: filtroOficio === oficioItem ? 'none' : '1px solid #E0E0E0',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {oficioItem}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#1E2A38', fontSize: '18px', marginBottom: '12px' }}>Directorio Sincronizado con Firebase</h2>

        {cargandoDatos ? (
          <p style={{ textAlign: 'center', color: '#1E2A38' }}>Sincronizando con Firebase...</p>
        ) : trabajadoresFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No hay profesionales registrados en Firebase con este oficio.</p>
        ) : (
          trabajadoresFiltrados.map((item) => (
            <div key={item.id} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              borderLeft: '6px solid #00A887'
            }}>
              <span style={{ fontSize: '12px', color: '#00A887', fontWeight: 'bold' }}>Oficio: {item.oficio}</span>
              <h3 style={{ fontSize: '16px', color: '#1E2A38', margin: '6px 0' }}>{item.nombre}</h3>
              <p style={{ fontSize: '13px', color: '#1E2A38', margin: '4px 0' }}><strong>Colonia:</strong> {item.colonia}</p>
              <p style={{ fontSize: '13px', color: '#1E2A38', margin: '4px 0' }}><strong>Teléfono:</strong> {item.telefono}</p>
              <p style={{ fontSize: '13px', color: '#76C043', fontWeight: 'bold', margin: '4px 0' }}>★ Rating: {item.rating || '5.0'}</p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPerfilSeleccionado(item)}
                  style={{ flex: 1, backgroundColor: '#1E2A38', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  🔍 Ver Perfil
                </button>
                <button
                  onClick={() => { setPerfilSeleccionado(item); setChatActivo(true); }}
                  style={{ flex: 1, backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  💬 Chat y Negociar (RF-04)
                </button>
                <button
                  onClick={() => { setPerfilSeleccionado(item); setPantalla('RateService'); }}
                  style={{ width: '100%', backgroundColor: '#76C043', color: '#FFF', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  ⭐ Calificar Servicio (RF-06)
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* MODAL DEL PERFIL Y PORTAFOLIO DE FOTOS (RF-02) */}
      {perfilSeleccionado && !chatActivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '450px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
            <button onClick={() => setPerfilSeleccionado(null)} style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#F5F7FA', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            <h2 style={{ fontSize: '20px', color: '#1E2A38', margin: '0 0 10px 0' }}>{perfilSeleccionado.nombre}</h2>
            <p style={{ fontSize: '13px', color: '#00A887', fontWeight: 'bold' }}>{perfilSeleccionado.oficio}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>Zona: {perfilSeleccionado.colonia} | Tel: {perfilSeleccionado.telefono}</p>
            <h3 style={{ fontSize: '14px', color: '#1E2A38', margin: '12px 0 6px 0' }}>🖼️ Portafolio de Trabajos Previos</h3>
            <img src={perfilSeleccionado.fotosTrabajos || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500"} alt="Trabajo" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }} />
            <button onClick={() => setChatActivo(true)} style={{ width: '100%', backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', marginTop: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              Iniciar Chat de Negociación (RF-04)
            </button>
          </div>
        </div>
      )}

      {/* RF-04: MÓDULO DE CHAT Y NEGOCIACIÓN EN TIEMPO REAL */}
      {chatActivo && perfilSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '480px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>
            
            <div style={{ backgroundColor: '#00A887', color: '#FFF', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', margin: 0 }}>💬 Chat RF-04: {perfilSeleccionado.nombre}</h3>
                <p style={{ fontSize: '11px', margin: 0, opacity: 0.9 }}>Negociación interactiva en Firebase</p>
              </div>
              <button onClick={() => { setChatActivo(false); setPerfilSeleccionado(null); }} style={{ backgroundColor: 'transparent', border: 'none', color: '#FFF', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#E6F6F3', padding: '10px 16px', borderBottom: '1px solid #D0EBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#1E2A38', fontWeight: 'bold' }}>Cotización acordada:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00A887' }}>$</span>
                <input 
                  type="number" 
                  value={propuestaCotizacion} 
                  onChange={(e) => setPropuestaCotizacion(e.target.value)}
                  style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #00A887', fontSize: '12px', fontWeight: 'bold' }} 
                />
                <span style={{ fontSize: '12px', color: '#666' }}>MXN</span>
              </div>
            </div>

            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F5F7FA' }}>
              {mensajesChat.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.remitente === 'usuario' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.remitente === 'usuario' ? '#00A887' : '#FFFFFF',
                  color: msg.remitente === 'usuario' ? '#FFFFFF' : '#1E2A38',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '75%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  fontSize: '13px'
                }}>
                  {msg.texto}
                  {msg.foto && (
                    <img src={msg.foto} alt="Evidencia falla" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={enviarMensajeChat} style={{ padding: '12px 16px', backgroundColor: '#FFF', borderTop: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="Adjuntar URL de foto de evidencia de la falla..."
                value={fotoFallaUrl}
                onChange={(e) => setFotoFallaUrl(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '11px', backgroundColor: '#F9FAFB', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Escribe tu mensaje o contraoferta..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <button type="submit" style={{ backgroundColor: '#00A887', color: '#FFF', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  Enviar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}