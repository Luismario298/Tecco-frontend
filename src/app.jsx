import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import logoTecco from './logo.png';
import RateService from './RateService';
import UploadPortfolio from './UploadPortfolio';
import HomeSection from './HomeSection';
import WorkerProfile from './WorkerProfile';
import MapScreen, { FullMapScreen } from './MapScreen';
import WorkerDirectory from './WorkerDirectory';
import WorkerRequestsPanel from './WorkerRequestsPanel';
import RealtimeChat from './RealtimeChat';
import { CloudinaryService } from './cloudinaryService';

export default function App() {
  const [pantalla, setPantalla] = useState('loading');
  const [routeParams, setRouteParams] = useState({ role: 'cliente', initialMode: 'login' });

  // Estados de Autenticación y Registro
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [archivoIne, setArchivoIne] = useState(null);
  const [subiendoIne, setSubiendoIne] = useState(false);

  // Estados de Perfil Profesional y Portafolio
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
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  // Galería y Chat en Tiempo Real
  const [galeriaPortafolio, setGaleriaPortafolio] = useState([]);
  const [cargandoGaleria, setCargandoGaleria] = useState(false);
  const [chatActivo, setChatActivo] = useState(false);
  const [chatSalaInfo, setChatSalaInfo] = useState(null);

  // Solicitud de Servicio
  const [detallesFallaCliente, setDetallesFallaCliente] = useState("");
  const [zonaSolicitud, setZonaSolicitud] = useState("Villas del Sol");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  const navigation = {
    navigate: (screen, params = {}) => {
      if (params.role || params.nombre || params.email || params.worker) {
        setRouteParams(prev => ({ ...prev, ...params }));
        if (params.worker) {
          setPerfilSeleccionado(params.worker);
        }
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

  const abrirPerfilDetallado = async (trabajador) => {
    setPerfilSeleccionado(trabajador);
    setPantalla('DetallePerfil');
    setCargandoGaleria(true);

    try {
      await cargarDatosFirestore();
      const q = query(collection(db, 'trabajadores_portafolio'), where('email', '==', trabajador.email));
      const querySnapshot = await getDocs(q);
      const fotos = querySnapshot.docs.map(doc => doc.data());
      setGaleriaPortafolio(fotos);
    } catch (error) {
      console.error("Error al cargar portafolio:", error);
    } finally {
      setCargandoGaleria(false);
    }
  };

  const handleEnviarSolicitudTrabajo = async (e) => {
    e.preventDefault();
    if (!detallesFallaCliente.trim()) {
      alert('Por favor describe los detalles de la falla o servicio requerido.');
      return;
    }

    setEnviandoSolicitud(true);
    try {
      await addDoc(collection(db, 'solicitudes_servicio'), {
        trabajador_id: perfilSeleccionado?.id || '',
        destinatario: perfilSeleccionado?.nombre || 'Especialista TECCO',
        cliente_email: email || route.params.email || 'cliente@tecco.com',
        detalles_falla: detallesFallaCliente,
        zona: zonaSolicitud,
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString()
      });

      alert('¡Solicitud de servicio enviada con éxito al especialista!');
      setDetallesFallaCliente("");
      await cargarDatosFirestore();
      setPantalla('Home');
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // Autenticación Tradicional con validación estricta en Firebase
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
      const rolActual = route.params.role || 'cliente';
      const coleccionObjetivo = rolActual === 'trabajador' ? 'trabajadores' : 'clientes';

      if (isLogin) {
        const q = query(
          collection(db, coleccionObjetivo), 
          where('email', '==', email.trim().toLowerCase()),
          where('password', '==', password)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          alert('❌ Acceso denegado: El correo o la contraseña son incorrectos, o la cuenta no existe en la base de datos.');
          return;
        }

        const userData = querySnapshot.docs[0].data();
        setNombre(userData.nombre || '');
        alert(`¡Bienvenido de nuevo, ${userData.nombre || 'Usuario'}!`);
        await cargarDatosFirestore();
        setPantalla('Home');

      } else {
        const qCheck = query(collection(db, coleccionObjetivo), where('email', '==', email.trim().toLowerCase()));
        const checkSnapshot = await getDocs(qCheck);

        if (!checkSnapshot.empty) {
          alert('⚠️ Este correo ya está registrado en la base de datos. Por favor inicia sesión.');
          return;
        }

        let ineUrlSubida = "";
        if (rolActual === 'trabajador') {
          if (archivoIne) {
            setSubiendoIne(true);
            ineUrlSubida = await CloudinaryService.subirImagen(archivoIne);
            setSubiendoIne(false);
            if (!ineUrlSubida) {
              alert("Error al subir la INE a Cloudinary.");
              return;
            }
          }
          navigation.navigate('RegisterTechnical', { nombre, email, password, ineUrl: ineUrlSubida });
        } else {
          await addDoc(collection(db, 'clientes'), {
            nombre: nombre,
            email: email.trim().toLowerCase(),
            password: password,
            rol: 'cliente',
            fecha_registro: serverTimestamp()
          });
          alert('¡Cuenta de cliente creada y guardada en Firebase exitosamente!');
          await cargarDatosFirestore();
          setPantalla('Home');
        }
      }
    } catch (error) {
      console.error("Error en autenticación con Firebase:", error);
      alert('Ocurrió un error al conectar con la base de datos.');
      setSubiendoIne(false);
    }
  };

  // Autenticación Social (Google / Facebook) con verificación y autorregistro automático en Firebase
  const handleSocialAuth = async (providerName) => {
    const dummyEmail = `usuario_${providerName.toLowerCase()}@tecco.com`;
    const dummyNombre = `Usuario de ${providerName}`;
    const rolActual = route.params.role || 'cliente';
    const coleccionObjetivo = rolActual === 'trabajador' ? 'trabajadores' : 'clientes';

    try {
      const q = query(collection(db, coleccionObjetivo), where('email', '==', dummyEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setNombre(dummyNombre);
        setEmail(dummyEmail);
        alert(`¡Sesión iniciada exitosamente con ${providerName}!`);
        await cargarDatosFirestore();
        setPantalla('Home');
      } else {
        // Si no existe, lo registramos automáticamente en Firebase
        await addDoc(collection(db, coleccionObjetivo), {
          nombre: dummyNombre,
          email: dummyEmail,
          password: 'social_auth_secure',
          rol: rolActual,
          fecha_registro: serverTimestamp(),
          disponible: true,
          rating: "5.0",
          colonia: "Villas del Sol"
        });
        setNombre(dummyNombre);
        setEmail(dummyEmail);
        alert(`¡Cuenta creada y acceso concedido vía ${providerName} en Firebase!`);
        await cargarDatosFirestore();
        setPantalla('Home');
      }
    } catch (error) {
      console.error(`Error en autenticación con ${providerName}:`, error);
      alert(`No se pudo completar el acceso con ${providerName}.`);
    }
  };

  const handleRegisterTechnicalSubmit = async (e) => {
    e.preventDefault();
    try {
      const fotoUrlFinal = fotosTrabajos || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500";
      
      await addDoc(collection(db, 'trabajadores'), {
        nombre: route.params.nombre || nombre,
        email: (route.params.email || email).trim().toLowerCase(),
        password: route.params.password || password,
        ine_url: route.params.ineUrl || "",
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

      alert('¡Perfil profesional y credenciales guardados exitosamente en Firebase!');
      await cargarDatosFirestore();
      setPantalla('Home');
    } catch (error) {
      console.error("Error al registrar trabajador:", error);
    }
  };

  // Renderizado condicional de pantallas
  if (pantalla === 'Home') {
    return (
      <WorkerDirectory 
        role={route.params.role} 
        trabajadores={trabajadores} 
        cargandoDatos={cargandoDatos} 
        onNavigate={(screen, params) => navigation.navigate(screen, params)}
        onSelectWorker={(worker) => abrirPerfilDetallado(worker)}
        onOpenChat={(worker) => { 
          setPerfilSeleccionado(worker); 
          setChatSalaInfo(null);
          setChatActivo(true); 
        }}
      />
    );
  }

  if (pantalla === 'WorkerRequests') {
    return (
      <WorkerRequestsPanel 
        workerEmail={email || route.params.email}
        workerName={nombre || route.params.nombre}
        onBack={() => setPantalla('Home')}
        onOpenChat={(infoSala) => {
          setChatSalaInfo(infoSala);
          setPerfilSeleccionado(null);
          setChatActivo(true);
        }}
      />
    );
  }

  if (pantalla === 'Map') {
    return <MapScreen navigation={navigation} />;
  }

  if (pantalla === 'FullMap') {
    return <FullMapScreen route={route} navigation={navigation} />;
  }

  if (pantalla === 'WorkerProfile') {
    return (
      <WorkerProfile 
        workerEmail={email || route.params.email} 
        workerName={nombre || route.params.nombre} 
        onBack={() => setPantalla('Home')} 
      />
    );
  }

  if (pantalla === 'UploadPortfolio') {
    return (
      <UploadPortfolio 
        workerEmail={email || route.params.email} 
        workerName={nombre || route.params.nombre} 
        onBack={() => { cargarDatosFirestore(); setPantalla('Home'); }} 
      />
    );
  }

  if (pantalla === 'RateService') {
    return (
      <RateService 
        workerId={perfilSeleccionado?.id} 
        workerName={perfilSeleccionado?.nombre} 
        onBack={() => setPantalla('DetallePerfil')} 
      />
    );
  }

  if (pantalla === 'RequestService' || pantalla === 'SolicitarTrabajo') {
    const targetWorker = route.params.worker || perfilSeleccionado;
    return (
      <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '16px', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <button onClick={() => setPantalla(targetWorker ? 'DetallePerfil' : 'Home')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: '#00A887' }}>← Volver</button>
          <h2 style={{ fontSize: '16px', color: '#1E2A38', margin: 0, fontWeight: '700' }}>🛒 Solicitar Cotización / Servicio</h2>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #EDF2F7', paddingBottom: '12px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#E6F6F3', color: '#00A887', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', fontWeight: 'bold' }}>
              🛠️
            </div>
            <div>
              <h3 style={{ fontSize: '15px', color: '#1E2A38', margin: '0 0 2px 0' }}>{targetWorker?.nombre || 'Especialista'}</h3>
              <p style={{ fontSize: '12px', color: '#00A887', fontWeight: 'bold', margin: 0 }}>Servicio de {targetWorker?.oficio || 'Técnico'}</p>
            </div>
          </div>

          <form onSubmit={handleEnviarSolicitudTrabajo} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#4A5568', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>¿Qué necesitas que repare o instale?</label>
              <textarea
                rows="4"
                placeholder="Ej. Fuga en tubería principal..."
                value={detallesFallaCliente}
                onChange={(e) => setDetallesFallaCliente(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box', fontSize: '13px', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#4A5568', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Dirección / Zona en Playa del Carmen</label>
              <select
                value={zonaSolicitud}
                onChange={(e) => setZonaSolicitud(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="Villas del Sol">Villas del Sol</option>
                <option value="Centro">Centro</option>
                <option value="Ejido">Ejido</option>
                <option value="Colosio">Colosio</option>
                <option value="Zama">Zama</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={enviandoSolicitud}
              style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.25)', boxSizing: 'border-box' }}
            >
              {enviandoSolicitud ? 'Enviando a Firebase...' : '🚀 Enviar Solicitud'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pantalla: Perfil Ampliado
  if (pantalla === 'DetallePerfil' && perfilSeleccionado) {
    return (
      <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '30px', fontFamily: 'Inter, Poppins, sans-serif', width: '100%', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#00A887', height: '140px', position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <button onClick={() => setPantalla('Home')} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>←</button>
          <span style={{ color: '#FFF', fontWeight: 'bold', marginLeft: '12px', fontSize: '16px' }}>Perfil Profesional</span>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', margin: '-50px 16px 16px 16px', padding: '20px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', position: 'relative', width: 'calc(100% - 32px)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-50px', marginBottom: '10px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#00A887', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: 'bold', border: '4px solid #FFF', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              {perfilSeleccionado.nombre ? perfilSeleccionado.nombre.charAt(0) : 'T'}
            </div>
          </div>

          <h1 style={{ fontSize: '22px', color: '#1E2A38', textAlign: 'center', margin: '0 0 4px 0', fontWeight: '700' }}>{perfilSeleccionado.nombre}</h1>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ backgroundColor: '#E6F6F3', color: '#00A887', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              🟢 Disponible
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', backgroundColor: '#F8F9FA', padding: '14px', borderRadius: '14px', marginBottom: '16px', fontSize: '13px', color: '#4A5568' }}>
            <div>⭐ <strong>Calificación:</strong> {perfilSeleccionado.rating || '5.0'}</div>
            <div>📞 <strong>Teléfono:</strong> {perfilSeleccionado.telefono || 'No reg.'}</div>
            <div>📍 <strong>Zona:</strong> {perfilSeleccionado.colonia}</div>
            <div>⏱️ <strong>Experiencia:</strong> {perfilSeleccionado.anosExperiencia || '3 años'}</div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {route.params.role === 'cliente' && (
              <button onClick={() => setPantalla('SolicitarTrabajo')} style={{ flex: 1, backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0, 168, 135, 0.2)' }}>🛠️ Solicitar Servicio</button>
            )}
            <button onClick={() => { setChatSalaInfo(null); setChatActivo(true); }} style={{ flex: 1, backgroundColor: '#1A202C', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>💬 Chat y Negociar</button>
          </div>
        </div>

        <div style={{ margin: '0 16px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '15px', color: '#1E2A38', marginBottom: '12px', fontWeight: '700' }}>🖼️ Galería de Trabajos Previos del Especialista</h3>
          {cargandoGaleria ? (
            <p style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>Cargando galería...</p>
          ) : galeriaPortafolio.length === 0 ? (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
              {perfilSeleccionado.fotosTrabajos && <img src={perfilSeleccionado.fotosTrabajos} alt="Trabajo" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px' }} />}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {galeriaPortafolio.map((item, index) => (
                <div key={index} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #EDF2F7' }}>
                  <img src={item.foto_url} alt={`Trabajo ${index + 1}`} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontSize: '13px', color: '#2D3748', margin: 0, fontWeight: '500' }}>{item.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (pantalla === 'loading') {
    return (
      <div style={{ backgroundColor: '#00A887', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#FFFFFF', fontFamily: 'Poppins, Inter, sans-serif', width: '100%', boxSizing: 'border-box' }}>
        <img src={logoTecco} alt="TECCO Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '700' }}>TECCO</h1>
        <p style={{ fontSize: '14px', letterSpacing: '2px', opacity: 0.9, margin: 0 }}>PLAYA DEL CARMEN</p>
      </div>
    );
  }

  if (pantalla === 'onboarding') {
    return (
      <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 24px', boxSizing: 'border-box', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ width: '140px', height: '140px', borderRadius: '28px', backgroundColor: '#00A887', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px', boxShadow: '0 10px 25px rgba(0, 168, 135, 0.2)' }}>
            <img src={logoTecco} alt="TECCO" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '24px', color: '#1E2A38', margin: '0 0 10px 0', fontWeight: '700' }}>Servicios a Domicilio</h2>
          <p style={{ fontSize: '14px', color: '#718096', lineHeight: '1.5' }}>Tu plataforma de especialistas locales en Playa del Carmen al instante.</p>
        </div>
        <button onClick={() => setPantalla('RoleSelection')} style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.3)', boxSizing: 'border-box' }}>Comenzar &gt;</button>
      </div>
    );
  }

  if (pantalla === 'RoleSelection') {
    return (
      <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', padding: '40px 20px', width: '100%', maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoTecco} alt="TECCO" style={{ width: '55px', height: '55px', objectFit: 'contain', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '22px', color: '#1E2A38', fontWeight: '700' }}>¿Cómo deseas ingresar?</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div onClick={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })} style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid #EDF2F7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '28px' }}>🏠</span>
            <div><h3 style={{ fontSize: '15px', margin: '0 0 2px 0', color: '#1E2A38' }}>Pedir Servicio Técnico</h3><p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Perfil Cliente</p></div>
          </div>
          <div onClick={() => navigation.navigate('Auth', { role: 'trabajador', initialMode: 'login' })} style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid #EDF2F7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '28px' }}>🛠️</span>
            <div><h3 style={{ fontSize: '15px', margin: '0 0 2px 0', color: '#1E2A38' }}>Ofrecer Mis Servicios</h3><p style={{ fontSize: '12px', color: '#718096', margin: 0 }}>Perfil Colaborador</p></div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de Autenticación con Botones Sociales y Diseño Responsivo Adaptado
  if (pantalla === 'Auth') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '30px 20px', width: '100%', maxWidth: '450px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        <button 
          onClick={() => setPantalla('RoleSelection')}
          style={{ backgroundColor: '#F1F5F9', border: 'none', color: '#334155', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Regresar
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', color: '#1E2A38', fontWeight: '700' }}>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          <p style={{ fontSize: '12px', color: '#00A887', fontWeight: 'bold' }}>{route.params.role === 'trabajador' ? '🛠️ Colaborador' : '🏠 Cliente'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#4A5568' }}>Nombre</label>
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#4A5568' }}>Correo</label>
            <input type="email" placeholder="correo@tecco.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#4A5568' }}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} />
          </div>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#4A5568' }}>Confirmar Contraseña</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} />
            </div>
          )}
          {!isLogin && route.params.role === 'trabajador' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#4A5568' }}>INE</label>
              <input type="file" accept="image/*" onChange={(e) => setArchivoIne(e.target.files[0])} style={{ fontSize: '12px', width: '100%', boxSizing: 'border-box' }} />
            </div>
          )}

          <button onClick={handleSubmit} disabled={subiendoIne} style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 10px rgba(0, 168, 135, 0.2)', width: '100%', boxSizing: 'border-box' }}>
            {subiendoIne ? 'Procesando...' : isLogin ? 'Entrar' : 'Registrarse'}
          </button>

          {/* Botones de Autenticación Social (Google y Facebook) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#A0AEC0', margin: '4px 0' }}>o continúa con</div>
            
            <button 
              onClick={() => handleSocialAuth('Google')}
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #DB4437', color: '#DB4437', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}
            >
              🌐 Continuar con Google
            </button>

            <button 
              onClick={() => handleSocialAuth('Facebook')}
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #4267B2', color: '#4267B2', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}
            >
              📘 Continuar con Facebook
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <span onClick={() => setIsLogin(!isLogin)} style={{ fontSize: '13px', color: '#00A887', cursor: 'pointer', fontWeight: 'bold' }}>{isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'RegisterTechnical') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '30px 20px', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '18px', color: '#1E2A38', textAlign: 'center', fontWeight: '700' }}>Registro Profesional</h2>
        <form onSubmit={handleRegisterTechnicalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', width: '100%', boxSizing: 'border-box' }}>
          <select value={oficio} onChange={(e) => setOficio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }}>
            <option value="Aire Acondicionado">Aire Acondicionado</option>
            <option value="Plomero">Plomero</option>
            <option value="Electricista">Electricista</option>
            <option value="Carpintero">Carpintero</option>
          </select>
          <input type="text" placeholder="Años de Experiencia" value={anosExperiencia} onChange={(e) => setAnosExperiencia(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }} />
          <input type="text" placeholder="URL Foto Portafolio Principal" value={fotosTrabajos} onChange={(e) => setFotosTrabajos(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }} />
          <select value={colonia} onChange={(e) => setColonia(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }}>
            <option value="Villas del Sol">Villas del Sol</option>
            <option value="Centro">Centro</option>
            <option value="Ejido">Ejido</option>
            <option value="Colosio">Colosio</option>
          </select>
          <input type="text" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8F9FA', boxSizing: 'border-box' }} />
          <button type="submit" style={{ backgroundColor: '#00A887', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>Guardar Perfil</button>
        </form>
      </div>
    );
  }

  return (
    <>
      {chatActivo && (
        <RealtimeChat 
          salaId={chatSalaInfo?.salaId || perfilSeleccionado?.id}
          currentUserRole={route.params.role}
          currentUserName={nombre || route.params.nombre}
          contraparteNombre={chatSalaInfo?.nombreContraparte || perfilSeleccionado?.nombre}
          onClose={() => {
            setChatActivo(false);
            setChatSalaInfo(null);
            setPerfilSeleccionado(null);
          }}
        />
      )}
    </>
  );
}