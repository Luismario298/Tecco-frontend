import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import logoTecco from './logo.png';
import RateService from './RateService';
import UploadPortfolio from './UploadPortfolio';
import WorkerProfile from './WorkerProfile';
import MapScreen, { FullMapScreen } from './MapScreen';
import WorkerRequestsPanel from './WorkerRequestsPanel';
import RealtimeChat from './RealtimeChat';
import { CloudinaryService } from './cloudinaryService';

const COLORS = {
  primary: '#00A887',
  secondary: '#1E2A38',
  background: '#0B131A',
  card: '#16222D',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37',
  accentWorker: '#F59E0B'
};

export default function App() {
  const [pantalla, setPantalla] = useState('loading');
  const [navTab, setNavTab] = useState('inicio');
  const [routeParams, setRouteParams] = useState({ role: 'cliente', initialMode: 'login' });

  // Control estricto de sesión activa y datos del usuario logueado
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserDocId, setCurrentUserDocId] = useState(null);
  const [pantallaPendiente, setPantallaPendiente] = useState(null);

  // Estados de Autenticación y Registro
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [archivoIne, setArchivoIne] = useState(null);
  const [subiendoIne, setSubiendoIne] = useState(false);

  // Estados de Perfil Profesional y Apartado "Publicar/Editar Servicio"
  const [oficio, setOficio] = useState("Aire Acondicionado");
  const [anosExperiencia, setAnosExperiencia] = useState("3 años");
  const [precioServicio, setPrecioServicio] = useState("$350/visita");
  const [descripcionServicio, setDescripcionServicio] = useState("");
  const [fotosTrabajos, setFotosTrabajos] = useState("");
  const [colonia, setColonia] = useState("Villas del Sol");
  const [telefono, setTelefono] = useState("");
  const [disponible, setDisponible] = useState(true);
  const [lat, setLat] = useState(20.630143);
  const [lon, setLon] = useState(-87.092946);
  const [guardandoServicio, setGuardandoServicio] = useState(false);

  // Estados de datos sincronizados con Firebase
  const [trabajadores, setTrabajadores] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);
  const [filtroOficio, setFiltroOficio] = useState('Todos');
  const [vistaModo, setVistaModo] = useState('lista');

  // Galería y Chat en Tiempo Real
  const [galeriaPortafolio, setGaleriaPortafolio] = useState([]);
  const [cargandoGaleria, setCargandoGaleria] = useState(false);
  const [chatActivo, setChatActivo] = useState(false);
  const [chatSalaInfo, setChatSalaInfo] = useState(null);

  // Solicitud de Servicio (Cliente)
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

  useEffect(() => {
    cargarDatosFirestore();
  }, []);

  const abrirPerfilDetallado = async (trabajador) => {
    setPerfilSeleccionado(trabajador);
    setPantalla('DetallePerfil');
    setCargandoGaleria(true);

    try {
      const q = query(collection(db, 'trabajadores_portafolio'), where('email', '==', trabajador.email?.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      const fotos = querySnapshot.docs.map(doc => doc.data());
      setGaleriaPortafolio(fotos);
    } catch (error) {
      console.error("Error al cargar portafolio:", error);
    } finally {
      setCargandoGaleria(false);
    }
  };

  const irASolicitarServicio = (workerTarget = null) => {
    if (workerTarget) {
      setPerfilSeleccionado(workerTarget);
    }

    if (!isAuthenticated) {
      alert('Para solicitar un servicio primero debes iniciar sesión o crear una cuenta.');
      setPantallaPendiente('SolicitarTrabajo');
      setIsLogin(true);
      navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' });
      return;
    }

    setPantalla('SolicitarTrabajo');
  };

  const handleEnviarSolicitudTrabajo = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Sesión requerida para enviar la solicitud.');
      setPantallaPendiente('SolicitarTrabajo');
      setPantalla('Auth');
      return;
    }

    if (!detallesFallaCliente.trim()) {
      alert('Por favor describe los detalles de la falla o servicio requerido.');
      return;
    }

    setEnviandoSolicitud(true);
    try {
      await addDoc(collection(db, 'solicitudes_servicio'), {
        trabajador_id: perfilSeleccionado?.id || '',
        destinatario: perfilSeleccionado?.nombre || 'Especialista TECCO',
        cliente_email: email || route.params.email,
        cliente_nombre: nombre || 'Cliente TECCO',
        detalles_falla: detallesFallaCliente,
        zona: zonaSolicitud,
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString()
      });

      alert('Solicitud de servicio enviada con éxito al especialista.');
      setDetallesFallaCliente("");
      await cargarDatosFirestore();
      setPantalla('Home');
      setNavTab('inicio');
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const toggleDisponibilidadTrabajador = async () => {
    const nuevoEstado = !disponible;
    setDisponible(nuevoEstado);

    if (currentUserDocId) {
      try {
        const workerRef = doc(db, 'trabajadores', currentUserDocId);
        await updateDoc(workerRef, { disponible: nuevoEstado });
        await cargarDatosFirestore();
      } catch (error) {
        console.error("Error actualizando disponibilidad:", error);
      }
    }
  };

  const handleGuardarMiServicio = async (e) => {
    e.preventDefault();
    setGuardandoServicio(true);

    try {
      const datosServicio = {
        nombre: nombre || 'Especialista TECCO',
        email: email.trim().toLowerCase(),
        oficio,
        anosExperiencia,
        precio: precioServicio,
        descripcion: descripcionServicio,
        colonia,
        telefono,
        disponible,
        fotosTrabajos: fotosTrabajos || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500",
        updatedAt: new Date().toISOString()
      };

      if (currentUserDocId) {
        const workerRef = doc(db, 'trabajadores', currentUserDocId);
        await updateDoc(workerRef, datosServicio);
      } else {
        const docRef = await addDoc(collection(db, 'trabajadores'), {
          ...datosServicio,
          rating: "5.0",
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          createdAt: new Date().toISOString()
        });
        setCurrentUserDocId(docRef.id);
      }

      alert('Tu servicio ha sido publicado y actualizado en el catálogo.');
      await cargarDatosFirestore();
      setNavTab('panel');
    } catch (error) {
      console.error("Error al guardar el servicio:", error);
      alert('No se pudo guardar la información del servicio.');
    } finally {
      setGuardandoServicio(false);
    }
  };

  const handleSubmit = async () => {
    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio || !password || (!isLogin && (!nombre.trim() || !confirmPassword))) {
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
          where('email', '==', emailLimpio),
          where('password', '==', password)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          alert('Acceso denegado: El correo o la contraseña son incorrectos, o la cuenta no está registrada en la base de datos.');
          return;
        }

        const docSnap = querySnapshot.docs[0];
        const userData = docSnap.data();
        setCurrentUserDocId(docSnap.id);
        setNombre(userData.nombre || '');
        setEmail(emailLimpio);
        setIsAuthenticated(true);

        if (rolActual === 'trabajador') {
          setOficio(userData.oficio || 'Aire Acondicionado');
          setAnosExperiencia(userData.anosExperiencia || '3 años');
          setPrecioServicio(userData.precio || '$350/visita');
          setDescripcionServicio(userData.descripcion || '');
          setColonia(userData.colonia || 'Villas del Sol');
          setTelefono(userData.telefono || '');
          setDisponible(userData.disponible !== undefined ? userData.disponible : true);
          setFotosTrabajos(userData.fotosTrabajos || '');
        }

        alert(`Bienvenido de nuevo, ${userData.nombre || 'Usuario'}.`);
        await cargarDatosFirestore();

        if (pantallaPendiente && rolActual === 'cliente') {
          const destino = pantallaPendiente;
          setPantallaPendiente(null);
          setPantalla(destino);
        } else {
          setPantalla('Home');
          setNavTab(rolActual === 'trabajador' ? 'panel' : 'inicio');
        }
      } else {
        const qCheck = query(collection(db, coleccionObjetivo), where('email', '==', emailLimpio));
        const checkSnapshot = await getDocs(qCheck);

        if (!checkSnapshot.empty) {
          alert('Este correo ya está registrado. Por favor inicia sesión con tus datos.');
          setIsLogin(true);
          return;
        }

        let ineUrlSubida = "";
        if (rolActual === 'trabajador') {
          if (archivoIne) {
            setSubiendoIne(true);
            ineUrlSubida = await CloudinaryService.subirImagen(archivoIne);
            setSubiendoIne(false);
            if (!ineUrlSubida) {
              alert("Error al subir la identificación.");
              return;
            }
          }
          navigation.navigate('RegisterTechnical', { nombre, email: emailLimpio, password, ineUrl: ineUrlSubida });
        } else {
          const docRef = await addDoc(collection(db, 'clientes'), {
            nombre: nombre.trim(),
            email: emailLimpio,
            password: password,
            rol: 'cliente',
            fecha_registro: serverTimestamp()
          });
          setCurrentUserDocId(docRef.id);
          setEmail(emailLimpio);
          setIsAuthenticated(true);
          alert('Cuenta creada y guardada exitosamente.');
          await cargarDatosFirestore();

          if (pantallaPendiente) {
            const destino = pantallaPendiente;
            setPantallaPendiente(null);
            setPantalla(destino);
          } else {
            setPantalla('Home');
            setNavTab('inicio');
          }
        }
      }
    } catch (error) {
      console.error("Error en autenticación con Firebase:", error);
      alert('Ocurrió un error al validar tus datos.');
      setSubiendoIne(false);
    }
  };

  const handleSocialAuth = async (providerName) => {
    const dummyEmail = `usuario_${providerName.toLowerCase()}@tecco.com`;
    const dummyNombre = `Usuario de ${providerName}`;
    const rolActual = route.params.role || 'cliente';
    const coleccionObjetivo = rolActual === 'trabajador' ? 'trabajadores' : 'clientes';

    try {
      const q = query(collection(db, coleccionObjetivo), where('email', '==', dummyEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setCurrentUserDocId(docSnap.id);
        setNombre(dummyNombre);
        setEmail(dummyEmail);
        setIsAuthenticated(true);
        alert(`Sesión iniciada exitosamente con ${providerName}.`);
        await cargarDatosFirestore();
      } else {
        const docRef = await addDoc(collection(db, coleccionObjetivo), {
          nombre: dummyNombre,
          email: dummyEmail,
          password: 'social_auth_secure',
          rol: rolActual,
          fecha_registro: serverTimestamp(),
          disponible: true,
          rating: "5.0",
          colonia: "Villas del Sol",
          oficio: "Aire Acondicionado",
          precio: "$350/visita"
        });
        setCurrentUserDocId(docRef.id);
        setNombre(dummyNombre);
        setEmail(dummyEmail);
        setIsAuthenticated(true);
        alert(`Cuenta creada y acceso concedido vía ${providerName}.`);
        await cargarDatosFirestore();
      }

      if (pantallaPendiente && rolActual === 'cliente') {
        const destino = pantallaPendiente;
        setPantallaPendiente(null);
        setPantalla(destino);
      } else {
        setPantalla('Home');
        setNavTab(rolActual === 'trabajador' ? 'panel' : 'inicio');
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
      const emailFinal = (route.params.email || email).trim().toLowerCase();
      
      const docRef = await addDoc(collection(db, 'trabajadores'), {
        nombre: route.params.nombre || nombre,
        email: emailFinal,
        password: route.params.password || password,
        ine_url: route.params.ineUrl || "",
        oficio: oficio,
        anosExperiencia: anosExperiencia,
        precio: precioServicio,
        descripcion: descripcionServicio,
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

      setCurrentUserDocId(docRef.id);
      setEmail(emailFinal);
      setIsAuthenticated(true);
      alert('Perfil profesional y credenciales guardados exitosamente.');
      await cargarDatosFirestore();
      setPantalla('Home');
      setNavTab('panel');
    } catch (error) {
      console.error("Error al registrar trabajador:", error);
    }
  };

  const cerrarSesion = () => {
    setIsAuthenticated(false);
    setCurrentUserDocId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPantallaPendiente(null);
    setRouteParams(prev => ({ ...prev, role: 'cliente' }));
    setNavTab('inicio');
    alert("Has cerrado sesión.");
  };

  // Barra de Navegación Inferior sin emojis
  const renderBottomNav = () => {
    const esColaborador = route.params.role === 'trabajador' && isAuthenticated;

    if (esColaborador) {
      return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#101B22', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-around', padding: '14px 0', zIndex: 1000, boxSizing: 'border-box' }}>
          <div onClick={() => { setPantalla('Home'); setNavTab('panel'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'panel' ? COLORS.accentWorker : COLORS.textSecondary }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Mi Panel</div>
          </div>
          <div onClick={() => { setPantalla('Home'); setNavTab('mi_servicio'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'mi_servicio' ? COLORS.accentWorker : COLORS.textSecondary }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Publicar Servicio</div>
          </div>
          <div onClick={() => { setPantalla('Home'); setNavTab('solicitudes'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'solicitudes' ? COLORS.accentWorker : COLORS.textSecondary }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Solicitudes</div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#101B22', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-around', padding: '14px 0', zIndex: 1000, boxSizing: 'border-box' }}>
        <div onClick={() => { setPantalla('Home'); setNavTab('inicio'); setVistaModo('lista'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'inicio' ? COLORS.primary : COLORS.textSecondary }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Inicio</div>
        </div>
        <div onClick={() => { setPantalla('Home'); setNavTab('mensajes'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'mensajes' ? COLORS.primary : COLORS.textSecondary }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Mensajes</div>
        </div>
        <div onClick={() => { setPantalla('Home'); setNavTab('cuenta'); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'cuenta' ? COLORS.primary : COLORS.textSecondary }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Cuenta</div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // PANTALLA PRINCIPAL (HOME)
  // =========================================================================
  if (pantalla === 'Home') {
    const esColaborador = route.params.role === 'trabajador' && isAuthenticated;

    // 1. VISTA EXCLUSIVA PARA COLABORADOR
    if (esColaborador) {
      const misSolicitudes = solicitudes.filter(s => s.destinatario === nombre || !s.destinatario);

      return (
        <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '16px 16px 80px 16px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', color: COLORS.textMain }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#131F2A', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: COLORS.accentWorker, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  MODO COLABORADOR
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0 0 0', color: COLORS.textMain }}>Hola, {nombre || 'Especialista'}</h2>
              </div>
              <button 
                onClick={cerrarSesion}
                style={{ backgroundColor: '#2D1A1E', color: '#FC8181', border: '1px solid #742A2A', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Salir
              </button>
            </div>

            {navTab === 'panel' && (
              <>
                <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '18px', border: `1px solid ${COLORS.border}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', margin: '0 0 4px 0', color: COLORS.textMain }}>Estado en el Mapa y Lista</h3>
                    <p style={{ fontSize: '12px', color: disponible ? COLORS.primary : COLORS.textSecondary, margin: 0, fontWeight: 'bold' }}>
                      {disponible ? 'Activo: Visible para clientes ahora' : 'Inactivo: Oculto del catálogo'}
                    </p>
                  </div>
                  <button 
                    onClick={toggleDisponibilidadTrabajador}
                    style={{ backgroundColor: disponible ? COLORS.primary : '#2D3748', color: disponible ? '#000' : '#FFF', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {disponible ? 'Desactivar' : 'Activar'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: COLORS.card, padding: '16px', borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 4px 0' }}>Solicitudes Activas</p>
                    <h4 style={{ fontSize: '24px', margin: 0, color: COLORS.textMain }}>{misSolicitudes.length}</h4>
                  </div>
                  <div style={{ backgroundColor: COLORS.card, padding: '16px', borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 4px 0' }}>Calificación</p>
                    <h4 style={{ fontSize: '24px', margin: 0, color: '#E2B714' }}>5.0</h4>
                  </div>
                </div>

                <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '18px', border: `1px solid ${COLORS.border}`, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.accentWorker }}>TU ANUNCIO ACTIVO</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.primary }}>{precioServicio}</span>
                  </div>
                  <h3 style={{ fontSize: '17px', margin: '0 0 4px 0', color: COLORS.textMain }}>{oficio}</h3>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 12px 0' }}>Zona base: {colonia} · Exp: {anosExperiencia}</p>
                  {descripcionServicio && (
                    <p style={{ fontSize: '13px', color: '#CBD5E0', backgroundColor: COLORS.background, padding: '10px', borderRadius: '10px', margin: '0 0 14px 0' }}>
                      "{descripcionServicio}"
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setNavTab('mi_servicio')}
                      style={{ flex: 1, backgroundColor: COLORS.accentWorker, color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Editar / Publicar Servicio
                    </button>
                    <button 
                      onClick={() => setPantalla('UploadPortfolio')}
                      style={{ flex: 1, backgroundColor: '#1E2D38', color: COLORS.textMain, border: `1px solid ${COLORS.border}`, padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Subir Fotos
                    </button>
                  </div>
                </div>
              </>
            )}

            {navTab === 'mi_servicio' && (
              <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}` }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.accentWorker, margin: '0 0 4px 0' }}>Publicar / Configurar Mi Servicio</h2>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 18px 0' }}>Esta información es la que verán los clientes en Playa del Carmen cuando busquen ayuda.</p>

                <form onSubmit={handleGuardarMiServicio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Especialidad / Oficio</label>
                    <select 
                      value={oficio} 
                      onChange={(e) => setOficio(e.target.value)} 
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box' }}
                    >
                      <option value="Aire Acondicionado">Aire Acondicionado</option>
                      <option value="Plomero">Plomero</option>
                      <option value="Electricista">Electricista</option>
                      <option value="Carpintero">Carpintero</option>
                      <option value="Pintor">Pintor</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Tarifa / Costo</label>
                      <input 
                        type="text" 
                        placeholder="Ej. $350/visita o Cotización" 
                        value={precioServicio} 
                        onChange={(e) => setPrecioServicio(e.target.value)} 
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Experiencia</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 5 años" 
                        value={anosExperiencia} 
                        onChange={(e) => setAnosExperiencia(e.target.value)} 
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box' }} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Descripción de lo que ofreces</label>
                    <textarea 
                      rows="3"
                      placeholder="Ej. Instalación, mantenimiento preventivo y carga de gas para minisplits..." 
                      value={descripcionServicio} 
                      onChange={(e) => setDescripcionServicio(e.target.value)} 
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '13px' }} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Colonia Principal</label>
                      <select 
                        value={colonia} 
                        onChange={(e) => setColonia(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box' }}
                      >
                        <option value="Villas del Sol">Villas del Sol</option>
                        <option value="Centro">Centro</option>
                        <option value="Playacar">Playacar</option>
                        <option value="Ejido">Ejido</option>
                        <option value="Colosio">Colosio</option>
                        <option value="Zazil-Ha">Zazil-Ha</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Teléfono WhatsApp</label>
                      <input 
                        type="text" 
                        placeholder="984 000 0000" 
                        value={telefono} 
                        onChange={(e) => setTelefono(e.target.value)} 
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box' }} 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={guardandoServicio}
                    style={{ backgroundColor: COLORS.accentWorker, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '6px', width: '100%' }}
                  >
                    {guardandoServicio ? 'Publicando...' : 'Publicar y Guardar Servicio'}
                  </button>
                </form>
              </div>
            )}

            {navTab === 'solicitudes' && (
              <WorkerRequestsPanel 
                workerEmail={email}
                workerName={nombre}
                onBack={() => setNavTab('panel')}
                onOpenChat={(infoSala) => {
                  setChatSalaInfo(infoSala);
                  setPerfilSeleccionado(null);
                  setChatActivo(true);
                }}
              />
            )}

          </div>
          {renderBottomNav()}
        </div>
      );
    }

    // 2. VISTA PARA CLIENTE
    const trabajadoresFiltrados = filtroOficio === 'Todos' 
      ? trabajadores 
      : trabajadores.filter(t => t.oficio?.toLowerCase() === filtroOficio.toLowerCase());

    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '16px 16px 80px 16px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', color: COLORS.textMain }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {navTab === 'inicio' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Playa del Carmen, Q. Roo</p>
                {isAuthenticated && (
                  <span style={{ fontSize: '11px', color: COLORS.primary, fontWeight: 'bold' }}>Sesión activa: {nombre || email}</span>
                )}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: COLORS.textMain, margin: '0 0 16px 0' }}>¿Qué necesitas arreglar?</h2>

              {/* Filtros de Oficios */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {['Todos', 'Plomero', 'Electricista', 'Carpintero', 'Pintor', 'Aire acondicionado'].map((ofItem) => (
                  <button
                    key={ofItem}
                    onClick={() => setFiltroOficio(ofItem)}
                    style={{
                      backgroundColor: filtroOficio === ofItem ? COLORS.primary : COLORS.card,
                      color: filtroOficio === ofItem ? '#000000' : COLORS.textMain,
                      border: `1px solid ${filtroOficio === ofItem ? COLORS.primary : COLORS.border}`,
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {ofItem}
                  </button>
                ))}
              </div>

              {/* Selector Lista / Mapa */}
              <div style={{ display: 'flex', backgroundColor: COLORS.card, borderRadius: '12px', padding: '4px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
                <button 
                  onClick={() => setVistaModo('lista')}
                  style={{ flex: 1, backgroundColor: vistaModo === 'lista' ? '#1E2D38' : 'transparent', color: vistaModo === 'lista' ? COLORS.textMain : COLORS.textSecondary, border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  Lista
                </button>
                <button 
                  onClick={() => setVistaModo('mapa')}
                  style={{ flex: 1, backgroundColor: vistaModo === 'mapa' ? '#1E2D38' : 'transparent', color: vistaModo === 'mapa' ? COLORS.textMain : COLORS.textSecondary, border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  Mapa
                </button>
              </div>

              {/* Mapa único embebido sin duplicación */}
              {vistaModo === 'mapa' ? (
                <div style={{ height: '55vh', width: '100%', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                  <FullMapScreen route={{ params: { trabajadores: trabajadoresFiltrados } }} navigation={navigation} embedded={true} />
                </div>
              ) : (
                <div>
                  {cargandoDatos ? (
                    <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '30px' }}>Cargando especialistas...</p>
                  ) : trabajadoresFiltrados.length === 0 ? (
                    <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '30px' }}>No hay especialistas en esta categoría.</p>
                  ) : (
                    trabajadoresFiltrados.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => abrirPerfilDetallado(item)}
                        style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '16px', marginBottom: '14px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1E2D38', color: COLORS.primary, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                            {item.nombre ? item.nombre.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textMain, margin: '0 0 2px 0' }}>{item.nombre}</h3>
                            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 6px 0' }}>{item.oficio} · {item.colonia || 'Centro'}</p>
                            <p style={{ fontSize: '12px', color: '#E2B714', margin: 0, fontWeight: 'bold' }}>Calificación: {item.rating || '4.9'} <span style={{ color: COLORS.textSecondary, fontWeight: 'normal' }}>(70+)</span></p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.textMain }}>{item.precio || '$350/visita'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {navTab === 'mensajes' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: COLORS.textMain, marginBottom: '16px' }}>Mensajes y Solicitudes</h2>
              {!isAuthenticated ? (
                <div style={{ backgroundColor: COLORS.card, padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <p style={{ color: COLORS.textSecondary, fontSize: '13px', marginBottom: '12px' }}>Inicia sesión para ver tus mensajes y solicitudes.</p>
                  <button 
                    onClick={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })}
                    style={{ backgroundColor: COLORS.primary, color: '#000', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Iniciar sesión
                  </button>
                </div>
              ) : (
                <div style={{ backgroundColor: COLORS.card, padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>Tus chats activos en tiempo real.</p>
                  <button 
                    onClick={() => { setChatSalaInfo({ salaId: 'sala_general', nombreContraparte: 'Soporte TECCO' }); setChatActivo(true); }}
                    style={{ backgroundColor: COLORS.primary, color: '#000', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
                  >
                    Abrir Chat Directo
                  </button>
                </div>
              )}
            </div>
          )}

          {navTab === 'cuenta' && (
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: COLORS.textMain, marginBottom: '16px' }}>Mi cuenta</h2>
              
              {!isAuthenticated ? (
                <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: '0 0 14px 0' }}>Inicia sesión para contratar.</p>
                  <button 
                    onClick={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })}
                    style={{ backgroundColor: COLORS.primary, color: '#000000', border: 'none', width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                  >
                    Iniciar sesión
                  </button>
                </div>
              ) : (
                <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.textMain, margin: '0 0 4px 0' }}>{nombre || 'Usuario Activo'}</p>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 12px 0' }}>{email} · Rol: CLIENTE</p>

                  <button 
                    onClick={cerrarSesion}
                    style={{ backgroundColor: '#2D1A1E', color: '#FC8181', border: '1px solid #742A2A', width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}

              <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '6px', border: `1px solid ${COLORS.border}` }}>
                <button 
                  onClick={() => navigation.navigate('RoleSelection')}
                  style={{ backgroundColor: 'transparent', color: COLORS.textMain, border: 'none', width: '100%', padding: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cambiar de rol (Ofrecer mis servicios)
                </button>
              </div>
            </div>
          )}

        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // =========================================================================
  // RESTO DE PANTALLAS
  // =========================================================================
  if (pantalla === 'Map') return <MapScreen navigation={navigation} />;
  if (pantalla === 'FullMap') return <FullMapScreen route={route} navigation={navigation} embedded={false} />;
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
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '16px', fontFamily: 'Inter, sans-serif', width: '100%', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box', color: COLORS.textMain }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', backgroundColor: COLORS.card, padding: '12px 16px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
          <button onClick={() => setPantalla(targetWorker ? 'DetallePerfil' : 'Home')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: COLORS.primary }}>← Volver</button>
          <h2 style={{ fontSize: '16px', color: COLORS.textMain, margin: 0, fontWeight: '700' }}>Solicitar Cotización / Servicio</h2>
        </div>

        <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}`, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: `1px solid ${COLORS.border}` }}>
            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 2px 0' }}>Especialista seleccionado:</p>
            <h3 style={{ fontSize: '16px', color: COLORS.primary, margin: 0 }}>{targetWorker?.nombre || 'Especialista TECCO'} ({targetWorker?.oficio})</h3>
          </div>

          <form onSubmit={handleEnviarSolicitudTrabajo} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div>
              <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>¿Qué necesitas que repare o instale?</label>
              <textarea
                rows="4"
                placeholder="Ej. Fuga en tubería principal..."
                value={detallesFallaCliente}
                onChange={(e) => setDetallesFallaCliente(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, boxSizing: 'border-box', fontSize: '13px', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Dirección / Zona en Playa del Carmen</label>
              <select
                value={zonaSolicitud}
                onChange={(e) => setZonaSolicitud(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: '13px', boxSizing: 'border-box' }}
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
              style={{ backgroundColor: COLORS.primary, color: '#000000', border: 'none', width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', boxSizing: 'border-box' }}
            >
              {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (pantalla === 'DetallePerfil' && perfilSeleccionado) {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', paddingBottom: '40px', fontFamily: 'Inter, sans-serif', width: '100%', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box', color: COLORS.textMain }}>
        <div style={{ backgroundColor: COLORS.primary, height: '140px', position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <button onClick={() => setPantalla('Home')} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>←</button>
          <span style={{ color: '#000', fontWeight: 'bold', marginLeft: '12px', fontSize: '16px' }}>Perfil Profesional</span>
        </div>

        <div style={{ backgroundColor: COLORS.card, borderRadius: '20px', margin: '-50px 16px 16px 16px', padding: '20px', border: `1px solid ${COLORS.border}`, position: 'relative', width: 'calc(100% - 32px)', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '22px', color: COLORS.textMain, textAlign: 'center', margin: '0 0 4px 0', fontWeight: '700' }}>{perfilSeleccionado.nombre}</h1>
          <p style={{ textAlign: 'center', color: COLORS.primary, fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px 0' }}>{perfilSeleccionado.oficio} · {perfilSeleccionado.precio || '$350/visita'}</p>
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '13px', margin: '0 0 14px 0' }}>Zona: {perfilSeleccionado.colonia || 'Centro'}</p>
          
          {perfilSeleccionado.descripcion && (
            <p style={{ fontSize: '13px', color: '#CBD5E0', backgroundColor: COLORS.background, padding: '12px', borderRadius: '12px', margin: '0 0 14px 0', textAlign: 'center' }}>
              "{perfilSeleccionado.descripcion}"
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => irASolicitarServicio(perfilSeleccionado)} style={{ flex: 1, backgroundColor: COLORS.primary, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Solicitar Servicio</button>
            <button onClick={() => { setChatSalaInfo(null); setChatActivo(true); }} style={{ flex: 1, backgroundColor: '#222D37', color: COLORS.textMain, border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Chat y Negociar</button>
          </div>
        </div>

        {/* Galería de Trabajos Subidos por el Colaborador */}
        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textMain, marginBottom: '12px' }}>Galería de Trabajos Previos</h3>
          
          {cargandoGaleria ? (
            <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '20px' }}>Cargando galería del especialista...</p>
          ) : galeriaPortafolio.length === 0 ? (
            <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: 0 }}>Este especialista aún no ha subido fotos a su portafolio.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {galeriaPortafolio.map((item, index) => (
                <div key={index} style={{ backgroundColor: COLORS.card, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img src={item.foto_url} alt={`Trabajo ${index + 1}`} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontSize: '13px', color: COLORS.textMain, margin: 0, fontWeight: '500' }}>{item.descripcion}</p>
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
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: COLORS.textMain, fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }}>
        <img src={logoTecco} alt="TECCO Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '700', color: COLORS.primary }}>TECCO</h1>
      </div>
    );
  }

  if (pantalla === 'onboarding') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 24px', boxSizing: 'border-box', width: '100%', maxWidth: '450px', margin: '0 auto', color: COLORS.textMain }}>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <img src={logoTecco} alt="TECCO" style={{ width: '140px', height: '140px', objectFit: 'contain', marginBottom: '24px' }} />
          <h2 style={{ fontSize: '24px', color: COLORS.textMain, margin: '0 0 10px 0', fontWeight: '700' }}>Servicios a Domicilio</h2>
          <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: '1.5' }}>Tu plataforma de especialistas locales en Playa del Carmen al instante.</p>
        </div>
        <button 
          onClick={() => { setPantalla('Home'); setNavTab('inicio'); }} 
          style={{ backgroundColor: COLORS.primary, color: '#000000', border: 'none', width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.3)' }}
        >
          Comenzar
        </button>
      </div>
    );
  }

  if (pantalla === 'RoleSelection') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '40px 20px', width: '100%', maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box', color: COLORS.textMain }}>
        <button 
          onClick={() => setPantalla('Home')}
          style={{ alignSelf: 'flex-start', backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Regresar
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '22px', color: COLORS.textMain, fontWeight: '700' }}>¿Cómo deseas ingresar?</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div onClick={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })} style={{ backgroundColor: COLORS.card, padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: `1px solid ${COLORS.border}` }}>
            <div><h3 style={{ fontSize: '15px', margin: '0 0 2px 0', color: COLORS.textMain }}>Pedir Servicio Técnico</h3><p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Perfil Cliente</p></div>
          </div>
          <div onClick={() => navigation.navigate('Auth', { role: 'trabajador', initialMode: 'login' })} style={{ backgroundColor: COLORS.card, padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: `1px solid ${COLORS.accentWorker}` }}>
            <div><h3 style={{ fontSize: '15px', margin: '0 0 2px 0', color: COLORS.accentWorker }}>Ofrecer Mis Servicios</h3><p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Panel Colaborador y Publicación</p></div>
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'Auth') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '30px 20px', width: '100%', maxWidth: '450px', margin: '0 auto', boxSizing: 'border-box', color: COLORS.textMain }}>
        <button 
          onClick={() => { setPantallaPendiente(null); setPantalla('Home'); }}
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Regresar
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', color: COLORS.textMain, fontWeight: '700' }}>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          <p style={{ fontSize: '12px', color: route.params.role === 'trabajador' ? COLORS.accentWorker : COLORS.primary, fontWeight: 'bold' }}>
            {route.params.role === 'trabajador' ? 'Modo Colaborador' : 'Modo Cliente'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Nombre Completo</label>
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', backgroundColor: COLORS.card, color: COLORS.textMain }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Correo Electrónico</label>
            <input type="email" placeholder="correo@tecco.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', backgroundColor: COLORS.card, color: COLORS.textMain }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', backgroundColor: COLORS.card, color: COLORS.textMain }} />
          </div>

          {!isLogin && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Confirmar Contraseña</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxSizing: 'border-box', backgroundColor: COLORS.card, color: COLORS.textMain }} />
            </div>
          )}

          {!isLogin && route.params.role === 'trabajador' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>INE (Identificación)</label>
              <input type="file" accept="image/*" onChange={(e) => setArchivoIne(e.target.files[0])} style={{ fontSize: '12px', width: '100%', boxSizing: 'border-box', color: COLORS.textSecondary }} />
            </div>
          )}

          <button onClick={handleSubmit} disabled={subiendoIne} style={{ backgroundColor: route.params.role === 'trabajador' ? COLORS.accentWorker : COLORS.primary, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>
            {subiendoIne ? 'Procesando...' : isLogin ? 'Entrar' : 'Registrarse'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', fontSize: '12px', color: COLORS.textSecondary, margin: '4px 0' }}>o continúa con</div>
            
            <button 
              onClick={() => handleSocialAuth('Google')}
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}
            >
              Continuar con Google
            </button>

            <button 
              onClick={() => handleSocialAuth('Facebook')}
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}
            >
              Continuar con Facebook
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <span onClick={() => setIsLogin(!isLogin)} style={{ fontSize: '13px', color: COLORS.primary, cursor: 'pointer', fontWeight: 'bold' }}>{isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'RegisterTechnical') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '30px 20px', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box', color: COLORS.textMain }}>
        <button 
          onClick={() => setPantalla('Auth')}
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          ← Regresar
        </button>

        <h2 style={{ fontSize: '18px', color: COLORS.accentWorker, textAlign: 'center', fontWeight: '700' }}>Configura Tu Servicio Profesional</h2>
        <form onSubmit={handleRegisterTechnicalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', width: '100%', boxSizing: 'border-box' }}>
          <select value={oficio} onChange={(e) => setOficio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, boxSizing: 'border-box' }}>
            <option value="Aire Acondicionado">Aire Acondicionado</option>
            <option value="Plomero">Plomero</option>
            <option value="Electricista">Electricista</option>
            <option value="Carpintero">Carpintero</option>
            <option value="Pintor">Pintor</option>
          </select>
          <input type="text" placeholder="Tarifa base (ej. $350/visita)" value={precioServicio} onChange={(e) => setPrecioServicio(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, boxSizing: 'border-box' }} />
          <input type="text" placeholder="Años de Experiencia" value={anosExperiencia} onChange={(e) => setAnosExperiencia(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, boxSizing: 'border-box' }} />
          <textarea rows="3" placeholder="Describe brevemente los trabajos que realizas..." value={descripcionServicio} onChange={(e) => setDescripcionServicio(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <input type="text" placeholder="Teléfono WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, boxSizing: 'border-box' }} />
          <button type="submit" style={{ backgroundColor: COLORS.accentWorker, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', width: '100%', boxSizing: 'border-box' }}>Publicar Servicio y Entrar</button>
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