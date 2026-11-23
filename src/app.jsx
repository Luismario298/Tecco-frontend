import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  modalBg: '#151F28',
  textMain: '#FFFFFF',
  textSecondary: '#8696A0',
  border: '#222D37',
  accentWorker: '#F59E0B',
  error: '#FC8181',
  errorBg: 'rgba(252, 129, 129, 0.12)'
};

const FAQ_ITEMS = [
  {
    pregunta: '¿Cómo solicito un especialista a domicilio?',
    respuesta: 'Selecciona al especialista en la pantalla Inicio, revisa su perfil y trabajos previos, y presiona "Solicitar Servicio". Indica los detalles de la falla y tu dirección exacta en Playa del Carmen.'
  },
  {
    pregunta: '¿Cuándo aparece el mapa de seguimiento?',
    respuesta: 'El mapa se activa automáticamente en cuanto envías tu solicitud de servicio para que puedas ubicar la zona del especialista asignado y gestionar tu solicitud.'
  },
  {
    pregunta: '¿Puedo cancelar o modificar una solicitud enviada?',
    respuesta: 'Sí. En la pantalla de seguimiento en mapa cuentas con los botones "Editar detalles" para corregir la dirección o falla, y "Cancelar solicitud" si deseas anularla.'
  },
  {
    pregunta: '¿Cómo me comunico con el técnico antes o durante el servicio?',
    respuesta: 'Desde el perfil del especialista o desde el mapa de seguimiento, presiona "Chat" para abrir la conversación en tiempo real.'
  }
];

export default function App() {
  const [pantalla, setPantalla] = useState('loading');
  const [navTab, setNavTab] = useState('inicio');
  const [routeParams, setRouteParams] = useState({ role: 'cliente', initialMode: 'login' });

  // Control estricto de sesión activa y datos del usuario logueado
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserDocId, setCurrentUserDocId] = useState(null);
  const [pantallaPendiente, setPantallaPendiente] = useState(null);

  // Notificación visual integrada (Heurística 4 - reemplaza alert())
  const [notificacion, setNotificacion] = useState(null);

  // Estados de Autenticación y Registro + Validación inline (Heurística 9)
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [archivoIne, setArchivoIne] = useState(null);
  const [subiendoIne, setSubiendoIne] = useState(false);
  const [erroresAuth, setErroresAuth] = useState({});

  // Estados de Perfil Profesional y Apartado "Publicar/Editar Servicio"
  const [oficio, setOficio] = useState("Aire acondicionado");
  const [anosExperiencia, setAnosExperiencia] = useState("3 años");
  const [descripcionServicio, setDescripcionServicio] = useState("");
  const [fotosTrabajos, setFotosTrabajos] = useState("");
  const [colonia, setColonia] = useState("Villas del Sol");
  const [telefono, setTelefono] = useState("");
  const [disponible, setDisponible] = useState(true);
  const [lat, setLat] = useState(20.630143);
  const [lon, setLon] = useState(-87.092946);
  const [guardandoServicio, setGuardandoServicio] = useState(false);
  const [ultimaActualizacionServicio, setUltimaActualizacionServicio] = useState(null);

  // Estados de datos sincronizados con Firebase
  const [trabajadores, setTrabajadores] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);
  const [filtroOficio, setFiltroOficio] = useState('Todos');
  const [busquedaGeneral, setBusquedaGeneral] = useState('');
  const [modalFiltroAbierto, setModalFiltroAbierto] = useState(false);
  const [busquedaFiltro, setBusquedaFiltro] = useState('');

  // Galería, Reseñas, Chat en Tiempo Real y Contador de Mensajes
  const [galeriaPortafolio, setGaleriaPortafolio] = useState([]);
  const [cargandoGaleria, setCargandoGaleria] = useState(false);
  const [chatActivo, setChatActivo] = useState(false);
  const [chatSalaInfo, setChatSalaInfo] = useState(null);
  const [mensajesEntrantesCount, setMensajesEntrantesCount] = useState(0);

  // Solicitud de Servicio y Seguimiento en Mapa
  const [detallesFallaCliente, setDetallesFallaCliente] = useState("");
  const [direccionExactaCliente, setDireccionExactaCliente] = useState("");
  const [zonaSolicitud, setZonaSolicitud] = useState("Villas del Sol");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [ultimaSolicitudEnviada, setUltimaSolicitudEnviada] = useState(null);
  const [cancelandoSolicitud, setCancelandoSolicitud] = useState(false);

  // Ayuda / FAQ (Heurística 10)
  const [faqAbierta, setFaqAbierta] = useState(null);

  const mostrarAviso = (mensaje, tipo = 'info') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => (prev?.mensaje === mensaje ? null : prev));
    }, 4000);
  };

  const navigation = {
    navigate: (screen, params = {}) => {
      if (params.role || params.nombre || params.email || params.worker) {
        setRouteParams(prev => ({ ...prev, ...params }));
        if (params.worker) {
          setPerfilSeleccionado(params.worker);
        }
      }
      setErroresAuth({});
      setPantalla(screen);
    }
  };

  const route = { params: routeParams };

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        box-sizing: border-box;
      }
      *::-webkit-scrollbar {
        display: none !important;
      }
      html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100vh !important;
        background-color: #0B131A !important;
        color: #FFFFFF !important;
        overflow-x: hidden !important;
        scroll-behavior: smooth;
        touch-action: pan-y pan-x;
      }
    `;
    document.head.appendChild(styleEl);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalFiltroAbierto) {
        setModalFiltroAbierto(false);
        return;
      }
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === 'ArrowDown') {
        window.scrollBy({ top: 140, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        window.scrollBy({ top: -140, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        window.scrollBy({ left: 120, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft') {
        window.scrollBy({ left: -120, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.head.removeChild(styleEl);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalFiltroAbierto]);

  useEffect(() => {
    if (pantalla === 'loading') {
      const timer = setTimeout(() => {
        setPantalla('onboarding');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pantalla]);

  // Escucha en tiempo real de mensajes para mostrar visibilidad del estado en la pestaña Mensajes
  useEffect(() => {
    if (!isAuthenticated || !email) {
      setMensajesEntrantesCount(0);
      return;
    }

    const emailUsuario = email.trim().toLowerCase();
    const unsubscribe = onSnapshot(
      collection(db, 'chats_mensajes'),
      (snapshot) => {
        let contador = 0;
        snapshot.docs.forEach((docItem) => {
          const data = docItem.data();
          const perteneceASala = typeof data.salaId === 'string' && data.salaId.includes(emailUsuario);
          const esDeOtro = (data.remitenteEmail || '').toLowerCase() !== emailUsuario;
          if (perteneceASala && esDeOtro) {
            contador += 1;
          }
        });
        setMensajesEntrantesCount(contador);
      },
      (error) => {
        console.error("Error al observar mensajes:", error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, email]);

  const cargarDatosFirestore = async () => {
    setCargandoDatos(true);
    try {
      const snapTrabajadores = await getDocs(collection(db, "trabajadores"));
      setTrabajadores(snapTrabajadores.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));

      const snapSolicitudes = await getDocs(collection(db, "solicitudes_servicio"));
      setSolicitudes(snapSolicitudes.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));

      const snapCalificaciones = await getDocs(collection(db, "calificaciones"));
      setCalificaciones(snapCalificaciones.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));

      setCargandoDatos(false);
    } catch (error) {
      console.error("Error al sincronizar con Firebase:", error);
      setCargandoDatos(false);
    }
  };

  useEffect(() => {
    cargarDatosFirestore();
  }, []);

  // Conteo real de reseñas y promedio por especialista (Heurísticas 2 y 6)
  const obtenerEstadisticasResenas = (worker) => {
    if (!worker) return { total: 0, promedio: '5.0', lista: [] };
    const lista = calificaciones.filter(
      (c) =>
        (c.workerId && c.workerId === worker.id) ||
        (c.trabajador_id && c.trabajador_id === worker.id) ||
        (c.workerName && worker.nombre && c.workerName.toLowerCase() === worker.nombre.toLowerCase())
    );
    if (lista.length === 0) {
      return { total: 0, promedio: worker.rating || '5.0', lista: [] };
    }
    const suma = lista.reduce((acc, item) => acc + (Number(item.rating || item.calificacion) || 5), 0);
    const promedio = (suma / lista.length).toFixed(1);
    return { total: lista.length, promedio, lista };
  };

  const { oficiosOrdenados, oficioMasPopular, oficiosAgrupadosPorLetra } = useMemo(() => {
    const baseOficios = ['Aire acondicionado', 'Carpintero', 'Electricista', 'Pintor', 'Plomero'];
    const conteo = {};

    trabajadores.forEach((t) => {
      if (t.oficio) {
        const normalizado = t.oficio.trim();
        conteo[normalizado] = (conteo[normalizado] || 0) + 1;
        const existeEnBase = baseOficios.some(o => o.toLowerCase() === normalizado.toLowerCase());
        if (!existeEnBase) {
          baseOficios.push(normalizado);
        }
      }
    });

    const ordenados = [...baseOficios].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    let masPopular = ordenados[0] || 'Plomero';
    let maxCantidad = 0;
    Object.entries(conteo).forEach(([oficioKey, cantidad]) => {
      if (cantidad > maxCantidad) {
        maxCantidad = cantidad;
        masPopular = oficioKey;
      }
    });

    const filtradosBusqueda = busquedaFiltro.trim()
      ? ordenados.filter(item => item.toLowerCase().includes(busquedaFiltro.trim().toLowerCase()))
      : ordenados;

    const grupos = {};
    filtradosBusqueda.forEach((item) => {
      const letra = item.charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!grupos[letra]) {
        grupos[letra] = [];
      }
      grupos[letra].push(item);
    });

    const letrasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));
    const agrupadosFinal = letrasOrdenadas.map(letra => ({
      letra,
      items: grupos[letra]
    }));

    return {
      oficiosOrdenados: ordenados,
      oficioMasPopular: masPopular,
      oficiosAgrupadosPorLetra: agrupadosFinal
    };
  }, [trabajadores, busquedaFiltro]);

  const obtenerDetallePorOficio = (trabajador) => {
    const oficioNormalizado = (trabajador?.oficio || '').trim().toLowerCase();

    if (trabajador?.descripcion && trabajador.descripcion.trim().length > 0) {
      return trabajador.descripcion.trim();
    }

    if (oficioNormalizado.includes('aire')) {
      return 'Especialidad en minisplits: limpieza profunda, revisión de gas y mantenimiento preventivo.';
    }
    if (oficioNormalizado.includes('plom')) {
      return 'Especialidad en hidráulica: fugas de agua, tuberías, tinacos y bombas.';
    }
    if (oficioNormalizado.includes('elect')) {
      return 'Especialidad eléctrica: cortos circuitos, cableado, contactos y centros de carga.';
    }
    if (oficioNormalizado.includes('carp')) {
      return 'Especialidad en madera: puertas, bisagras, clósets, muebles y ajustes.';
    }
    if (oficioNormalizado.includes('pint')) {
      return 'Especialidad en acabados: pintura en muros, resanes, sellador e impermeabilización.';
    }

    return `Servicios profesionales en ${trabajador?.oficio || 'mantenimiento general'} · Exp: ${trabajador?.anosExperiencia || '3 años'}.`;
  };

  const abrirPerfilDetallado = async (trabajador) => {
    setModalFiltroAbierto(false);
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
      mostrarAviso('Inicia sesión para enviar una solicitud de servicio.', 'info');
      setPantallaPendiente('SolicitarTrabajo');
      setIsLogin(true);
      navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' });
      return;
    }

    setPantalla('SolicitarTrabajo');
  };

  const abrirChatConEspecialista = (workerTarget = null) => {
    const objetivo = workerTarget || perfilSeleccionado;
    if (objetivo) {
      setPerfilSeleccionado(objetivo);
    }

    if (!isAuthenticated) {
      mostrarAviso('Inicia sesión para iniciar una conversación con el especialista.', 'info');
      setPantallaPendiente('AbrirChat');
      setIsLogin(true);
      navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' });
      return;
    }

    const clienteKey = (email || 'cliente').trim().toLowerCase();
    const workerKey = (objetivo?.email || objetivo?.id || 'especialista').trim().toLowerCase();
    const salaGenerada = `sala_${clienteKey}__${workerKey}`;

    setChatSalaInfo({
      salaId: salaGenerada,
      nombreContraparte: objetivo?.nombre || 'Especialista TECCO'
    });
    setChatActivo(true);
  };

  const handleEnviarSolicitudTrabajo = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setPantallaPendiente('SolicitarTrabajo');
      setPantalla('Auth');
      return;
    }

    if (!detallesFallaCliente.trim()) {
      mostrarAviso('Describe los detalles de la falla o servicio requerido.', 'error');
      return;
    }

    if (!direccionExactaCliente.trim()) {
      mostrarAviso('Indica la calle, número o referencias exactas del domicilio.', 'error');
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const especialistaDestino = perfilSeleccionado;
      const nuevaSolicitud = {
        trabajador_id: especialistaDestino?.id || '',
        destinatario: especialistaDestino?.nombre || 'Especialista TECCO',
        oficio: especialistaDestino?.oficio || filtroOficio,
        cliente_email: email || route.params.email,
        cliente_nombre: nombre || 'Cliente TECCO',
        detalles_falla: detallesFallaCliente.trim(),
        direccion_exacta: direccionExactaCliente.trim(),
        zona: zonaSolicitud,
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'solicitudes_servicio'), nuevaSolicitud);

      setUltimaSolicitudEnviada({ id: docRef.id, ...nuevaSolicitud });
      await cargarDatosFirestore();
      mostrarAviso('Solicitud enviada. Ahora puedes dar seguimiento en el mapa.', 'success');
      setPantalla('MapaSolicitud');
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      mostrarAviso('No se pudo enviar la solicitud. Intenta de nuevo.', 'error');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleCancelarSolicitudActiva = async () => {
    if (!ultimaSolicitudEnviada || cancelandoSolicitud) return;
    setCancelandoSolicitud(true);
    try {
      if (ultimaSolicitudEnviada.id) {
        await deleteDoc(doc(db, 'solicitudes_servicio', ultimaSolicitudEnviada.id));
      }
      setUltimaSolicitudEnviada(null);
      setDetallesFallaCliente("");
      setDireccionExactaCliente("");
      await cargarDatosFirestore();
      mostrarAviso('Solicitud cancelada correctamente.', 'info');
      setPantalla('Home');
      setNavTab('inicio');
    } catch (error) {
      console.error("Error al cancelar solicitud:", error);
      mostrarAviso('No se pudo cancelar la solicitud. Intenta de nuevo.', 'error');
    } finally {
      setCancelandoSolicitud(false);
    }
  };

  const handleEditarSolicitudActiva = () => {
    if (ultimaSolicitudEnviada) {
      setDetallesFallaCliente(ultimaSolicitudEnviada.detalles_falla || '');
      setDireccionExactaCliente(ultimaSolicitudEnviada.direccion_exacta || '');
      setZonaSolicitud(ultimaSolicitudEnviada.zona || 'Villas del Sol');
    }
    setPantalla('SolicitarTrabajo');
  };

  const toggleDisponibilidadTrabajador = async () => {
    const nuevoEstado = !disponible;
    setDisponible(nuevoEstado);

    if (currentUserDocId) {
      try {
        const workerRef = doc(db, 'trabajadores', currentUserDocId);
        await updateDoc(workerRef, { disponible: nuevoEstado });
        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setUltimaActualizacionServicio(horaActual);
        await cargarDatosFirestore();
        mostrarAviso(nuevoEstado ? 'Tu perfil ahora es visible para clientes.' : 'Tu perfil se ocultó del catálogo.', 'success');
      } catch (error) {
        console.error("Error actualizando disponibilidad:", error);
        mostrarAviso('No se pudo actualizar el estado.', 'error');
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

      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setUltimaActualizacionServicio(horaActual);
      mostrarAviso('Tu servicio ha sido publicado y actualizado en el catálogo.', 'success');
      await cargarDatosFirestore();
      setNavTab('panel');
    } catch (error) {
      console.error("Error al guardar el servicio:", error);
      mostrarAviso('No se pudo guardar la información del servicio.', 'error');
    } finally {
      setGuardandoServicio(false);
    }
  };

  const handleSubmit = async () => {
    const emailLimpio = email.trim().toLowerCase();
    const nuevosErrores = {};

    if (!isLogin && !nombre.trim()) {
      nuevosErrores.nombre = 'Ingresa tu nombre completo.';
    }
    if (!emailLimpio) {
      nuevosErrores.email = 'Ingresa tu correo electrónico.';
    } else if (!emailLimpio.includes('@')) {
      nuevosErrores.email = 'Escribe un correo electrónico válido.';
    }
    if (!password) {
      nuevosErrores.password = 'Ingresa tu contraseña.';
    }
    if (!isLogin && !confirmPassword) {
      nuevosErrores.confirmPassword = 'Confirma tu contraseña.';
    } else if (!isLogin && password !== confirmPassword) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresAuth(nuevosErrores);
      return;
    }

    setErroresAuth({});

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
          setErroresAuth({
            general: 'Correo o contraseña incorrectos, o la cuenta no está registrada.',
            email: 'Verifica el correo ingresado.',
            password: 'Verifica tu contraseña.'
          });
          return;
        }

        const docSnap = querySnapshot.docs[0];
        const userData = docSnap.data();
        setCurrentUserDocId(docSnap.id);
        setNombre(userData.nombre || '');
        setEmail(emailLimpio);
        setIsAuthenticated(true);
        setErroresAuth({});

        if (rolActual === 'trabajador') {
          setOficio(userData.oficio || 'Aire acondicionado');
          setAnosExperiencia(userData.anosExperiencia || '3 años');
          setDescripcionServicio(userData.descripcion || '');
          setColonia(userData.colonia || 'Villas del Sol');
          setTelefono(userData.telefono || '');
          setDisponible(userData.disponible !== undefined ? userData.disponible : true);
          setFotosTrabajos(userData.fotosTrabajos || '');
        }

        mostrarAviso(`Bienvenido de nuevo, ${userData.nombre || 'Usuario'}.`, 'success');
        await cargarDatosFirestore();

        if (pantallaPendiente && rolActual === 'cliente') {
          const destino = pantallaPendiente;
          setPantallaPendiente(null);
          if (destino === 'AbrirChat') {
            setPantalla('DetallePerfil');
            const workerKey = (perfilSeleccionado?.email || perfilSeleccionado?.id || 'especialista').trim().toLowerCase();
            setChatSalaInfo({
              salaId: `sala_${emailLimpio}__${workerKey}`,
              nombreContraparte: perfilSeleccionado?.nombre || 'Especialista TECCO'
            });
            setChatActivo(true);
          } else {
            setPantalla(destino);
          }
        } else {
          setPantalla('Home');
          setNavTab(rolActual === 'trabajador' ? 'panel' : 'inicio');
        }
      } else {
        const qCheck = query(collection(db, coleccionObjetivo), where('email', '==', emailLimpio));
        const checkSnapshot = await getDocs(qCheck);

        if (!checkSnapshot.empty) {
          setErroresAuth({
            email: 'Este correo ya está registrado. Cambia a Iniciar sesión.'
          });
          return;
        }

        let ineUrlSubida = "";
        if (rolActual === 'trabajador') {
          if (archivoIne) {
            setSubiendoIne(true);
            ineUrlSubida = await CloudinaryService.subirImagen(archivoIne);
            setSubiendoIne(false);
            if (!ineUrlSubida) {
              setErroresAuth({ general: 'No se pudo subir la identificación. Intenta nuevamente.' });
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
          mostrarAviso('Cuenta creada exitosamente.', 'success');
          await cargarDatosFirestore();

          if (pantallaPendiente) {
            const destino = pantallaPendiente;
            setPantallaPendiente(null);
            if (destino === 'AbrirChat') {
              setPantalla('DetallePerfil');
              const workerKey = (perfilSeleccionado?.email || perfilSeleccionado?.id || 'especialista').trim().toLowerCase();
              setChatSalaInfo({
                salaId: `sala_${emailLimpio}__${workerKey}`,
                nombreContraparte: perfilSeleccionado?.nombre || 'Especialista TECCO'
              });
              setChatActivo(true);
            } else {
              setPantalla(destino);
            }
          } else {
            setPantalla('Home');
            setNavTab('inicio');
          }
        }
      }
    } catch (error) {
      console.error("Error en autenticación con Firebase:", error);
      setErroresAuth({ general: 'Ocurrió un error de conexión al validar tus datos.' });
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
          oficio: "Aire acondicionado"
        });
        setCurrentUserDocId(docRef.id);
        setNombre(dummyNombre);
        setEmail(dummyEmail);
        setIsAuthenticated(true);
        await cargarDatosFirestore();
      }

      mostrarAviso(`Sesión iniciada con ${providerName}.`, 'success');

      if (pantallaPendiente && rolActual === 'cliente') {
        const destino = pantallaPendiente;
        setPantallaPendiente(null);
        if (destino === 'AbrirChat') {
          setPantalla('DetallePerfil');
          const workerKey = (perfilSeleccionado?.email || perfilSeleccionado?.id || 'especialista').trim().toLowerCase();
          setChatSalaInfo({
            salaId: `sala_${dummyEmail}__${workerKey}`,
            nombreContraparte: perfilSeleccionado?.nombre || 'Especialista TECCO'
          });
          setChatActivo(true);
        } else {
          setPantalla(destino);
        }
      } else {
        setPantalla('Home');
        setNavTab(rolActual === 'trabajador' ? 'panel' : 'inicio');
      }
    } catch (error) {
      console.error(`Error en autenticación con ${providerName}:`, error);
      setErroresAuth({ general: `No se pudo completar el acceso con ${providerName}.` });
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
      mostrarAviso('Perfil profesional publicado correctamente.', 'success');
      await cargarDatosFirestore();
      setPantalla('Home');
      setNavTab('panel');
    } catch (error) {
      console.error("Error al registrar trabajador:", error);
      mostrarAviso('Error al guardar el perfil profesional.', 'error');
    }
  };

  const cerrarSesion = () => {
    setIsAuthenticated(false);
    setCurrentUserDocId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErroresAuth({});
    setPantallaPendiente(null);
    setChatActivo(false);
    setChatSalaInfo(null);
    setUltimaSolicitudEnviada(null);
    setMensajesEntrantesCount(0);
    setRouteParams(prev => ({ ...prev, role: 'cliente' }));
    setNavTab('inicio');
    mostrarAviso('Has cerrado sesión.', 'info');
  };

  const renderToast = () => {
    if (!notificacion) return null;
    const esError = notificacion.tipo === 'error';
    return (
      <div
        style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          backgroundColor: esError ? '#2D1A1E' : '#132A26',
          color: esError ? COLORS.error : COLORS.primary,
          border: `1px solid ${esError ? COLORS.error : COLORS.primary}`,
          padding: '10px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxWidth: '90vw',
          textAlign: 'center'
        }}
      >
        {notificacion.mensaje}
      </div>
    );
  };

  const renderBottomNav = () => {
    const esColaborador = route.params.role === 'trabajador' && isAuthenticated;

    if (esColaborador) {
      return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#101B22', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-around', padding: '14px 0', zIndex: 1000, width: '100%' }}>
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
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#101B22', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-around', padding: '14px 0', zIndex: 1000, width: '100%' }}>
        <div onClick={() => { setPantalla('Home'); setNavTab('inicio'); setModalFiltroAbierto(false); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'inicio' ? COLORS.primary : COLORS.textSecondary }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Inicio</div>
        </div>
        <div onClick={() => { setPantalla('Home'); setNavTab('mensajes'); setModalFiltroAbierto(false); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'mensajes' ? COLORS.primary : COLORS.textSecondary, position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Mensajes</span>
          {mensajesEntrantesCount > 0 && (
            <span style={{ backgroundColor: COLORS.primary, color: '#000000', fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '999px' }}>
              {mensajesEntrantesCount}
            </span>
          )}
        </div>
        <div onClick={() => { setPantalla('Home'); setNavTab('cuenta'); setModalFiltroAbierto(false); }} style={{ textAlign: 'center', cursor: 'pointer', color: navTab === 'cuenta' ? COLORS.primary : COLORS.textSecondary }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Cuenta</div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // CHAT EN TIEMPO REAL TIPO WHATSAPP (SUPERPUESTO SOBRE CUALQUIER PANTALLA)
  // =========================================================================
  if (chatActivo) {
    return (
      <RealtimeChat
        salaId={chatSalaInfo?.salaId || perfilSeleccionado?.id}
        currentUserEmail={email || route.params.email}
        currentUserRole={route.params.role}
        currentUserName={nombre || route.params.nombre}
        contraparteNombre={chatSalaInfo?.nombreContraparte || perfilSeleccionado?.nombre}
        onClose={() => {
          setChatActivo(false);
          setChatSalaInfo(null);
        }}
      />
    );
  }

  // =========================================================================
  // MAPA MOSTRADO DESPUÉS DE SOLICITAR UN SERVICIO (CON CONTROL DE CANCELAR/EDITAR)
  // =========================================================================
  if (pantalla === 'MapaSolicitud') {
    const trabajadoresMapa = perfilSeleccionado ? [perfilSeleccionado] : trabajadores;

    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '16px 16px 80px 16px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', backgroundColor: COLORS.card, padding: '14px 16px', borderRadius: '14px', border: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '16px', margin: 0, color: COLORS.primary, fontWeight: 'bold' }}>Solicitud enviada · Seguimiento en mapa</h2>
              <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '4px 0 0 0' }}>
                {ultimaSolicitudEnviada?.destinatario || perfilSeleccionado?.nombre || 'Especialista'} · {ultimaSolicitudEnviada?.zona || zonaSolicitud}
              </p>
              {ultimaSolicitudEnviada?.direccion_exacta && (
                <p style={{ fontSize: '12px', color: '#CBD5E0', margin: '4px 0 0 0' }}>
                  Domicilio: {ultimaSolicitudEnviada.direccion_exacta}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setPantalla('Home'); setNavTab('inicio'); }}
              style={{ backgroundColor: '#1E2D38', color: COLORS.textMain, border: `1px solid ${COLORS.border}`, padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Inicio
            </button>
          </div>

          <div style={{ height: '56vh', width: '100%', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card }}>
            <FullMapScreen route={{ params: { trabajadores: trabajadoresMapa } }} navigation={navigation} embedded={true} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => abrirChatConEspecialista(perfilSeleccionado)}
              style={{ flex: 1, minWidth: '150px', backgroundColor: COLORS.primary, color: '#000000', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Chatear con el especialista
            </button>
            <button
              type="button"
              onClick={handleEditarSolicitudActiva}
              style={{ backgroundColor: COLORS.card, color: COLORS.textMain, border: `1px solid ${COLORS.border}`, padding: '13px 14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Editar detalles
            </button>
            <button
              type="button"
              disabled={cancelandoSolicitud}
              onClick={handleCancelarSolicitudActiva}
              style={{ backgroundColor: '#2D1A1E', color: COLORS.error, border: '1px solid #742A2A', padding: '13px 14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              {cancelandoSolicitud ? 'Cancelando...' : 'Cancelar solicitud'}
            </button>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // =========================================================================
  // PANTALLA PRINCIPAL (HOME)
  // =========================================================================
  if (pantalla === 'Home') {
    const esColaborador = route.params.role === 'trabajador' && isAuthenticated;

    // 1. VISTA EXCLUSIVA PARA COLABORADOR
    if (esColaborador) {
      const misSolicitudes = solicitudes.filter(s => s.destinatario === nombre || !s.destinatario);

      return (
        <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '16px 16px 80px 16px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, overflowY: 'auto' }}>
          {renderToast()}
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#131F2A', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: COLORS.accentWorker, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  MODO COLABORADOR
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0 0 0', color: COLORS.textMain }}>Hola, {nombre || 'Especialista'}</h2>
              </div>
              <button 
                onClick={cerrarSesion}
                style={{ backgroundColor: '#2D1A1E', color: COLORS.error, border: '1px solid #742A2A', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Salir
              </button>
            </div>

            {navTab === 'panel' && (
              <>
                <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '18px', border: `1px solid ${COLORS.border}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', margin: '0 0 4px 0', color: COLORS.textMain }}>Estado en la Lista</h3>
                    <p style={{ fontSize: '12px', color: disponible ? COLORS.primary : COLORS.textSecondary, margin: 0, fontWeight: 'bold' }}>
                      {disponible ? 'Activo: Visible para clientes ahora' : 'Inactivo: Oculto del catálogo'}
                    </p>
                    {ultimaActualizacionServicio && (
                      <p style={{ fontSize: '11px', color: COLORS.textSecondary, margin: '4px 0 0 0' }}>
                        Última actualización: {ultimaActualizacionServicio}
                      </p>
                    )}
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
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.primary }}>{disponible ? 'Disponible' : 'No disponible'}</span>
                  </div>
                  <h3 style={{ fontSize: '17px', margin: '0 0 4px 0', color: COLORS.textMain }}>{oficio}</h3>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 12px 0' }}>Zona base: {colonia} · Exp: {anosExperiencia}</p>
                  {descripcionServicio && (
                    <p style={{ fontSize: '13px', color: '#CBD5E0', backgroundColor: COLORS.background, padding: '10px', borderRadius: '10px', margin: '0 0 14px 0' }}>
                      "{descripcionServicio}"
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                    <button
                      onClick={() => abrirPerfilDetallado({ id: currentUserDocId, nombre, email, oficio, colonia, anosExperiencia, descripcion: descripcionServicio, rating: '5.0' })}
                      style={{ width: '100%', backgroundColor: 'transparent', color: COLORS.primary, border: `1px solid ${COLORS.border}`, padding: '10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Vista previa como cliente
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
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain }}
                    >
                      {oficiosOrdenados.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Experiencia</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 5 años" 
                      value={anosExperiencia} 
                      onChange={(e) => setAnosExperiencia(e.target.value)} 
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain }} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Descripción de lo que ofreces</label>
                    <textarea 
                      rows="3"
                      placeholder="Ej. Instalación, mantenimiento preventivo y carga de gas para minisplits..." 
                      value={descripcionServicio} 
                      onChange={(e) => setDescripcionServicio(e.target.value)} 
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, fontFamily: 'inherit', fontSize: '13px' }} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.textSecondary, display: 'block', marginBottom: '6px' }}>Colonia Principal</label>
                      <select 
                        value={colonia} 
                        onChange={(e) => setColonia(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain }}
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
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain }} 
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
    const trabajadoresFiltrados = trabajadores.filter((t) => {
      const coincideOficio =
        filtroOficio === 'Todos' || t.oficio?.toLowerCase() === filtroOficio.toLowerCase();
      const termino = busquedaGeneral.trim().toLowerCase();
      const coincideTexto =
        !termino ||
        t.nombre?.toLowerCase().includes(termino) ||
        t.oficio?.toLowerCase().includes(termino) ||
        t.colonia?.toLowerCase().includes(termino) ||
        t.descripcion?.toLowerCase().includes(termino);
      return coincideOficio && coincideTexto;
    });

    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '16px 16px 80px 16px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

          {navTab === 'inicio' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>Playa del Carmen, Q. Roo</p>
                {isAuthenticated && (
                  <span style={{ fontSize: '11px', color: COLORS.primary, fontWeight: 'bold' }}>Sesión activa: {nombre || email}</span>
                )}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: COLORS.textMain, margin: '0 0 12px 0' }}>¿Qué necesitas arreglar?</h2>

              {/* Búsqueda directa por nombre, oficio o colonia (Heurística 7) */}
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar especialista por nombre, oficio o colonia..."
                  value={busquedaGeneral}
                  onChange={(e) => setBusquedaGeneral(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.card,
                    color: COLORS.textMain,
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Barra de filtro que abre el modal estilo Mercado Libre */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setBusquedaFiltro(''); setModalFiltroAbierto(true); }}
                    style={{
                      backgroundColor: filtroOficio !== 'Todos' ? COLORS.primary : COLORS.card,
                      color: filtroOficio !== 'Todos' ? '#000000' : COLORS.textMain,
                      border: `1px solid ${filtroOficio !== 'Todos' ? COLORS.primary : COLORS.border}`,
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Oficio: {filtroOficio}
                  </button>

                  {(filtroOficio !== 'Todos' || busquedaGeneral.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => { setFiltroOficio('Todos'); setBusquedaGeneral(''); }}
                      style={{
                        backgroundColor: 'transparent',
                        color: COLORS.textSecondary,
                        border: `1px solid ${COLORS.border}`,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroOficio(filtroOficio === oficioMasPopular ? 'Todos' : oficioMasPopular)}
                  style={{
                    backgroundColor: filtroOficio === oficioMasPopular ? COLORS.primary : COLORS.card,
                    color: filtroOficio === oficioMasPopular ? '#000000' : COLORS.textMain,
                    border: `1px solid ${filtroOficio === oficioMasPopular ? COLORS.primary : COLORS.border}`,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Más popular: {oficioMasPopular}
                </button>
              </div>

              {/* MODAL CENTRADO ESTILO MERCADO LIBRE */}
              {modalFiltroAbierto && (
                <div
                  onClick={() => setModalFiltroAbierto(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.72)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '16px'
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      maxHeight: '82vh',
                      backgroundColor: COLORS.modalBg,
                      borderRadius: '10px',
                      border: `1px solid ${COLORS.border}`,
                      padding: '22px',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: COLORS.textMain, margin: 0 }}>Oficio</h3>
                      <button
                        type="button"
                        onClick={() => setModalFiltroAbierto(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.textSecondary,
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={busquedaFiltro}
                      onChange={(e) => setBusquedaFiltro(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.background,
                        color: COLORS.textMain,
                        fontSize: '13px',
                        marginBottom: '16px'
                      }}
                    />

                    <div style={{ paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}`, marginBottom: '14px' }}>
                      <span
                        onClick={() => { setFiltroOficio('Todos'); setModalFiltroAbierto(false); }}
                        style={{
                          fontSize: '13px',
                          color: filtroOficio === 'Todos' ? COLORS.primary : COLORS.textMain,
                          fontWeight: filtroOficio === 'Todos' ? 'bold' : 'normal',
                          cursor: 'pointer'
                        }}
                      >
                        Todos
                      </span>
                    </div>

                    {oficiosAgrupadosPorLetra.length === 0 ? (
                      <p style={{ fontSize: '13px', color: COLORS.textSecondary, textAlign: 'center', margin: '16px 0' }}>
                        No se encontraron oficios con ese nombre.
                      </p>
                    ) : (
                      oficiosAgrupadosPorLetra.map((grupo, idx) => (
                        <div
                          key={grupo.letra}
                          style={{
                            paddingBottom: '14px',
                            marginBottom: '14px',
                            borderBottom: idx < oficiosAgrupadosPorLetra.length - 1 ? `1px solid ${COLORS.border}` : 'none'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.textMain, marginBottom: '10px' }}>
                            {grupo.letra}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                            {grupo.items.map((item) => {
                              const seleccionada = filtroOficio.toLowerCase() === item.toLowerCase();
                              const esPopular = item.toLowerCase() === oficioMasPopular.toLowerCase();
                              return (
                                <div
                                  key={item}
                                  onClick={() => { setFiltroOficio(item); setModalFiltroAbierto(false); }}
                                  style={{
                                    fontSize: '13px',
                                    color: seleccionada ? COLORS.primary : COLORS.textSecondary,
                                    fontWeight: seleccionada ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span>{item}</span>
                                  {esPopular && (
                                    <span style={{ fontSize: '10px', color: COLORS.primary, fontWeight: 'bold' }}>
                                      Popular
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Lista de especialistas */}
              <div>
                {cargandoDatos ? (
                  <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '30px' }}>Cargando especialistas...</p>
                ) : trabajadoresFiltrados.length === 0 ? (
                  <p style={{ textAlign: 'center', color: COLORS.textSecondary, padding: '30px' }}>No hay especialistas que coincidan con tu búsqueda.</p>
                ) : (
                  trabajadoresFiltrados.map((item) => {
                    const stats = obtenerEstadisticasResenas(item);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => abrirPerfilDetallado(item)}
                        style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '16px', marginBottom: '14px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1E2D38', color: COLORS.primary, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
                            {item.nombre ? item.nombre.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textMain, margin: 0 }}>{item.nombre}</h3>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: 'rgba(0, 168, 135, 0.14)', color: COLORS.primary, padding: '2px 8px', borderRadius: '6px' }}>
                                {item.oficio || 'Especialista'}
                              </span>
                            </div>

                            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 6px 0' }}>
                              Oficio: <strong style={{ color: COLORS.textMain }}>{item.oficio}</strong> · {item.colonia || 'Centro'} · Exp: {item.anosExperiencia || '3 años'}
                            </p>

                            <p style={{ fontSize: '12px', color: '#CBD5E0', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                              {obtenerDetallePorOficio(item)}
                            </p>

                            <p style={{ fontSize: '12px', color: '#E2B714', margin: 0, fontWeight: 'bold' }}>
                              Calificación: {stats.promedio}{' '}
                              <span style={{ color: COLORS.textSecondary, fontWeight: 'normal' }}>
                                ({stats.total === 0 ? 'Sin reseñas aún' : `${stats.total} reseña${stats.total === 1 ? '' : 's'}`})
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
                  <p style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
                    {mensajesEntrantesCount > 0
                      ? `Tienes ${mensajesEntrantesCount} mensaje(s) recibido(s) en tus conversaciones.`
                      : 'Tus chats activos en tiempo real.'}
                  </p>
                  <button 
                    onClick={() => { setChatSalaInfo({ salaId: `sala_${(email || 'cliente').trim().toLowerCase()}__soporte`, nombreContraparte: 'Soporte TECCO' }); setChatActivo(true); }}
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
                    style={{ backgroundColor: '#2D1A1E', color: COLORS.error, border: '1px solid #742A2A', width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}

              <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '6px', border: `1px solid ${COLORS.border}`, marginBottom: '16px' }}>
                <button 
                  onClick={() => navigation.navigate('RoleSelection')}
                  style={{ backgroundColor: 'transparent', color: COLORS.textMain, border: 'none', width: '100%', padding: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cambiar de rol (Ofrecer mis servicios)
                </button>
              </div>

              {/* Heurística 10: Ayuda y preguntas frecuentes */}
              <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '18px', border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textMain, margin: '0 0 12px 0' }}>Ayuda y preguntas frecuentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {FAQ_ITEMS.map((item, idx) => {
                    const abierta = faqAbierta === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setFaqAbierta(abierta ? null : idx)}
                        style={{
                          backgroundColor: COLORS.background,
                          borderRadius: '10px',
                          padding: '12px',
                          border: `1px solid ${COLORS.border}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.textMain }}>{item.pregunta}</span>
                          <span style={{ fontSize: '12px', color: COLORS.primary, fontWeight: 'bold' }}>{abierta ? '−' : '+'}</span>
                        </div>
                        {abierta && (
                          <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '8px 0 0 0', lineHeight: '1.45' }}>
                            {item.respuesta}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
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
        onBack={() => { cargarDatosFirestore(); setPantalla('DetallePerfil'); }} 
      />
    );
  }

  if (pantalla === 'RequestService' || pantalla === 'SolicitarTrabajo') {
    const targetWorker = route.params.worker || perfilSeleccionado;
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '16px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', backgroundColor: COLORS.card, padding: '12px 16px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setPantalla(targetWorker ? 'DetallePerfil' : 'Home')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold', color: COLORS.primary }}>← Volver</button>
            <h2 style={{ fontSize: '16px', color: COLORS.textMain, margin: 0, fontWeight: '700' }}>Solicitar Servicio</h2>
          </div>

          <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '20px', border: `1px solid ${COLORS.border}`, width: '100%' }}>
            <div style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: `1px solid ${COLORS.border}` }}>
              <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: '0 0 2px 0' }}>Especialista seleccionado:</p>
              <h3 style={{ fontSize: '16px', color: COLORS.primary, margin: 0 }}>{targetWorker?.nombre || 'Especialista TECCO'} ({targetWorker?.oficio})</h3>
            </div>

            <form onSubmit={handleEnviarSolicitudTrabajo} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>¿Qué necesitas que repare o instale?</label>
                <textarea
                  rows="4"
                  placeholder="Ej. Fuga en tubería principal o revisión de minisplit..."
                  value={detallesFallaCliente}
                  onChange={(e) => setDetallesFallaCliente(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: '13px', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Zona en Playa del Carmen</label>
                <select
                  value={zonaSolicitud}
                  onChange={(e) => setZonaSolicitud(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: '13px' }}
                >
                  <option value="Villas del Sol">Villas del Sol</option>
                  <option value="Centro">Centro</option>
                  <option value="Ejido">Ejido</option>
                  <option value="Colosio">Colosio</option>
                  <option value="Zama">Zama</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Calle, número o referencias exactas</label>
                <input
                  type="text"
                  placeholder="Ej. Av. Constituyentes entre 115 y 120, casa color crema"
                  value={direccionExactaCliente}
                  onChange={(e) => setDireccionExactaCliente(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={enviandoSolicitud}
                style={{ backgroundColor: COLORS.primary, color: '#000000', border: 'none', width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}
              >
                {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'DetallePerfil' && perfilSeleccionado) {
    const statsPerfil = obtenerEstadisticasResenas(perfilSeleccionado);
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', paddingBottom: '40px', fontFamily: 'Inter, sans-serif', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ backgroundColor: COLORS.primary, height: '140px', position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', width: '100%' }}>
            <button onClick={() => setPantalla('Home')} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>←</button>
            <span style={{ color: '#000', fontWeight: 'bold', marginLeft: '12px', fontSize: '16px' }}>Perfil Profesional</span>
          </div>

          <div style={{ backgroundColor: COLORS.card, borderRadius: '20px', margin: '-50px 16px 16px 16px', padding: '20px', border: `1px solid ${COLORS.border}`, position: 'relative', width: 'calc(100% - 32px)' }}>
            <h1 style={{ fontSize: '22px', color: COLORS.textMain, textAlign: 'center', margin: '0 0 4px 0', fontWeight: '700' }}>{perfilSeleccionado.nombre}</h1>
            <p style={{ textAlign: 'center', color: COLORS.primary, fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px 0' }}>{perfilSeleccionado.oficio}</p>
            <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '13px', margin: '0 0 14px 0' }}>
              Zona: {perfilSeleccionado.colonia || 'Centro'} · Exp: {perfilSeleccionado.anosExperiencia || '3 años'} · Calificación: {statsPerfil.promedio}
            </p>
            
            <p style={{ fontSize: '13px', color: '#CBD5E0', backgroundColor: COLORS.background, padding: '12px', borderRadius: '12px', margin: '0 0 14px 0', textAlign: 'center' }}>
              "{obtenerDetallePorOficio(perfilSeleccionado)}"
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => irASolicitarServicio(perfilSeleccionado)} style={{ flex: 1, minWidth: '140px', backgroundColor: COLORS.primary, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Solicitar Servicio</button>
              <button onClick={() => abrirChatConEspecialista(perfilSeleccionado)} style={{ flex: 1, minWidth: '100px', backgroundColor: '#222D37', color: COLORS.textMain, border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Chat</button>
              <button onClick={() => setPantalla('RateService')} style={{ width: '100%', backgroundColor: 'transparent', color: '#E2B714', border: `1px solid ${COLORS.border}`, padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Calificar servicio</button>
            </div>
          </div>

          {/* Galería de trabajos previos */}
          <div style={{ padding: '0 16px', marginBottom: '22px' }}>
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

          {/* Heurística 6: Reseñas verificadas visibles en el perfil */}
          <div style={{ padding: '0 16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textMain, marginBottom: '12px' }}>
              Reseñas de clientes ({statsPerfil.total})
            </h3>
            {statsPerfil.lista.length === 0 ? (
              <div style={{ backgroundColor: COLORS.card, borderRadius: '16px', padding: '18px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
                <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: 0 }}>Aún no hay reseñas escritas para este especialista.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {statsPerfil.lista.map((resena, idx) => (
                  <div key={idx} style={{ backgroundColor: COLORS.card, borderRadius: '14px', padding: '14px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.textMain }}>{resena.clienteNombre || 'Cliente verificado'}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#E2B714' }}>{resena.rating || resena.calificacion || '5.0'} / 5</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#CBD5E0', margin: 0 }}>{resena.comentario || resena.comment || 'Servicio completado satisfactoriamente.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'loading') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: COLORS.textMain, fontFamily: 'Inter, sans-serif' }}>
        <img src={logoTecco} alt="TECCO Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '700', color: COLORS.primary }}>TECCO</h1>
      </div>
    );
  }

  if (pantalla === 'onboarding') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 24px', color: COLORS.textMain }}>
        <div style={{ maxWidth: '450px', margin: '40px auto 0 auto', width: '100%', textAlign: 'center' }}>
          <img src={logoTecco} alt="TECCO" style={{ width: '140px', height: '140px', objectFit: 'contain', marginBottom: '24px' }} />
          <h2 style={{ fontSize: '24px', color: COLORS.textMain, margin: '0 0 10px 0', fontWeight: '700' }}>Servicios a Domicilio</h2>
          <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: '1.5' }}>Tu plataforma de especialistas locales en Playa del Carmen al instante.</p>
        </div>
        <div style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
          <button 
            onClick={() => { setPantalla('Home'); setNavTab('inicio'); }} 
            style={{ backgroundColor: COLORS.primary, color: '#000000', border: 'none', width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 135, 0.3)' }}
          >
            Comenzar
          </button>
        </div>
      </div>
    );
  }

  if (pantalla === 'RoleSelection') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '40px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: COLORS.textMain }}>
        <div style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
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
      </div>
    );
  }

  if (pantalla === 'Auth') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '30px 20px', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
          <button 
            onClick={() => { setPantallaPendiente(null); setErroresAuth({}); setPantalla('Home'); }}
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
          >
            ← Regresar
          </button>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: COLORS.textMain, fontWeight: '700' }}>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
            <p style={{ fontSize: '12px', color: route.params.role === 'trabajador' ? COLORS.accentWorker : COLORS.primary, fontWeight: 'bold' }}>
              {route.params.role === 'trabajador' ? 'Modo Colaborador' : 'Modo Cliente'}
            </p>
          </div>

          {erroresAuth.general && (
            <div style={{ backgroundColor: COLORS.errorBg, border: `1px solid ${COLORS.error}`, color: COLORS.error, padding: '10px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '12px' }}>
              {erroresAuth.general}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setErroresAuth(prev => ({ ...prev, nombre: null, general: null })); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${erroresAuth.nombre ? COLORS.error : COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }}
                />
                {erroresAuth.nombre && (
                  <span style={{ display: 'block', color: COLORS.error, fontSize: '11px', marginTop: '4px' }}>{erroresAuth.nombre}</span>
                )}
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@tecco.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErroresAuth(prev => ({ ...prev, email: null, general: null })); }}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${erroresAuth.email ? COLORS.error : COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }}
              />
              {erroresAuth.email && (
                <span style={{ display: 'block', color: COLORS.error, fontSize: '11px', marginTop: '4px' }}>{erroresAuth.email}</span>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErroresAuth(prev => ({ ...prev, password: null, general: null })); }}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${erroresAuth.password ? COLORS.error : COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }}
              />
              {erroresAuth.password && (
                <span style={{ display: 'block', color: COLORS.error, fontSize: '11px', marginTop: '4px' }}>{erroresAuth.password}</span>
              )}
            </div>

            {!isLogin && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErroresAuth(prev => ({ ...prev, confirmPassword: null, general: null })); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${erroresAuth.confirmPassword ? COLORS.error : COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }}
                />
                {erroresAuth.confirmPassword && (
                  <span style={{ display: 'block', color: COLORS.error, fontSize: '11px', marginTop: '4px' }}>{erroresAuth.confirmPassword}</span>
                )}
              </div>
            )}

            {!isLogin && route.params.role === 'trabajador' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: COLORS.textSecondary }}>INE (Identificación)</label>
                <input type="file" accept="image/*" onChange={(e) => setArchivoIne(e.target.files[0])} style={{ fontSize: '12px', width: '100%', color: COLORS.textSecondary }} />
              </div>
            )}

            <button onClick={handleSubmit} disabled={subiendoIne} style={{ backgroundColor: route.params.role === 'trabajador' ? COLORS.accentWorker : COLORS.primary, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', width: '100%' }}>
              {subiendoIne ? 'Procesando...' : isLogin ? 'Entrar' : 'Registrarse'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', width: '100%' }}>
              <div style={{ textAlign: 'center', fontSize: '12px', color: COLORS.textSecondary, margin: '4px 0' }}>o continúa con</div>
              
              <button 
                onClick={() => handleSocialAuth('Google')}
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}
              >
                Continuar con Google
              </button>

              <button 
                onClick={() => handleSocialAuth('Facebook')}
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}
              >
                Continuar con Facebook
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <span onClick={() => { setErroresAuth({}); setIsLogin(!isLogin); }} style={{ fontSize: '13px', color: COLORS.primary, cursor: 'pointer', fontWeight: 'bold' }}>{isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pantalla === 'RegisterTechnical') {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', width: '100%', padding: '30px 20px', color: COLORS.textMain, overflowY: 'auto' }}>
        {renderToast()}
        <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
          <button 
            onClick={() => setPantalla('Auth')}
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.textMain, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
          >
            ← Regresar
          </button>

          <h2 style={{ fontSize: '18px', color: COLORS.accentWorker, textAlign: 'center', fontWeight: '700' }}>Configura Tu Servicio Profesional</h2>
          <form onSubmit={handleRegisterTechnicalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', width: '100%' }}>
            <select value={oficio} onChange={(e) => setOficio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }}>
              {oficiosOrdenados.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input type="text" placeholder="Años de Experiencia" value={anosExperiencia} onChange={(e) => setAnosExperiencia(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }} />
            <textarea rows="3" placeholder="Describe brevemente los trabajos que realizas..." value={descripcionServicio} onChange={(e) => setDescripcionServicio(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain, fontFamily: 'inherit' }} />
            <input type="text" placeholder="Teléfono WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textMain }} />
            <button type="submit" style={{ backgroundColor: COLORS.accentWorker, color: '#000000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', width: '100%' }}>Publicar Servicio y Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}