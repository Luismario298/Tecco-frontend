import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Switch 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// Credenciales oficiales de Firebase provistas por tu equipo
const firebaseConfig = {
  apiKey: "AIzaSyCx53NSPFD0-rWY_82oISSnm-BA5KVdzqQ",
  projectId: "notyproxy",
  storageBucket: "notyproxy.firebasestorage.app"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.log("Firebase ya inicializado o error de conexión:", e);
}

const Stack = createNativeStackNavigator();


const COLORS = {
  primary: '#00A887',    
  secondary: '#1E2A38',  
  background: '#F5F7FA', 
  white: '#FFFFFF',
  textSecondary: '#666666',
  cardBorder: '#E0E0E0',
  success: '#2E7D32',
  warning: '#ED6C02',
  warningBackground: '#FFF3E0',
  warningBorder: '#FFE0B2',
  socialGoogle: '#DB4437',
  socialFacebook: '#4267B2',
};


// pantalla de carga

function LoadingScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('GetStarted');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.splashContainer}>
      <Text style={{ fontSize: 70 }}>🦝</Text>
      <Text style={styles.splashTitle}>TECCO</Text>
      <Text style={styles.splashSubtitle}>Playa del Carmen, Q. Roo</Text>
      
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    </View>
  );
}


// pantalla que da la bienvenida

function GetStartedScreen({ navigation }) {
  return (
    <View style={styles.getStartedContainer}>
      <View style={styles.getStartedContent}>
        <View style={styles.logoCircle}>
          <Text style={{ fontSize: 75 }}>🦝</Text>
        </View>
        <Text style={styles.heroTitle}>Bienvenido</Text>
        <Text style={styles.heroDescription}>
         
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.primaryButton}
        onPress={() => navigation.navigate('RoleSelection')}
      >
        <Text style={styles.primaryButtonText}>Comenzar </Text>
      </TouchableOpacity>
    </View>
  );
}


// pantalla en donde se selecciona el rol de cada quien

function RoleSelectionScreen({ navigation }) {
  return (
    <View style={styles.roleContainer}>
      <Text style={styles.roleTitle}>¿Cómo deseas ingresar?</Text>
      <Text style={styles.roleSubtitle}>Selecciona tu perfil en TECCO</Text>

      <TouchableOpacity 
        style={styles.roleCard}
        onPress={() => navigation.navigate('Auth', { role: 'cliente', initialMode: 'login' })}
      >
        <Text style={styles.roleIcon}>🏠</Text>
        <View style={styles.roleTextContainer}>
          <Text style={styles.roleCardTitle}>Solicitar Servicio</Text>
          <Text style={styles.roleCardDesc}>Encuentra especialistas cercanos a ti.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.roleCard}
        onPress={() => navigation.navigate('Auth', { role: 'trabajador', initialMode: 'login' })}
      >
        <Text style={styles.roleIcon}>🧰</Text>
        <View style={styles.roleTextContainer}>
          <Text style={styles.roleCardTitle}>Colaborador</Text>
          <Text style={styles.roleCardDesc}>Ofrece tus servicios y recibe solicitudes locales.</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}


// en donde se inicia sesion y poder ver contraseñas

function AuthScreen({ route, navigation }) {
  const { role, initialMode } = route.params || { role: 'cliente', initialMode: 'login' };
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = () => {
    if (!email || !password || (!isLogin && (!nombre || !confirmPassword))) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos obligatorios.');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (isLogin) {
      Alert.alert('¡Bienvenido de nuevo!', `Has iniciado sesión como ${role}.`, [
        { text: 'Continuar', onPress: () => navigation.navigate('Map', { role }) }
      ]);
    } else {
      if (role === 'trabajador') {
        navigation.navigate('RegisterTechnical', { nombre, email });
      } else {
        Alert.alert('¡Cuenta creada con éxito!', 'Bienvenido a TECCO.', [
          { text: 'Explorar Mapa', onPress: () => navigation.navigate('Map', { role: 'cliente' }) }
        ]);
      }
    }
  };

  const handleSocialAuth = (platform) => {
    Alert.alert('Acceso Social', `Simulación de autenticación con ${platform} exitosa.`);
    if (role === 'trabajador') {
      navigation.navigate('RegisterTechnical', { nombre: `Usuario de ${platform}`, email: `user@${platform.toLowerCase()}.com` });
    } else {
      navigation.navigate('Map', { role: 'cliente' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={{ fontSize: 50, marginBottom: 8 }}>🦝</Text>
        <Text style={styles.authTitle}>{isLogin ? 'Iniciar Sesión' : 'Registro de Cuenta'}</Text>
        <Text style={styles.authSubtitle}>
          {role === 'trabajador' ? '🧰 Perfil Trabajador' : '🏠 Perfil Cliente'}
        </Text>
      </View>

      <View style={styles.formFieldsGroup}>
        {!isLogin && (
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput style={styles.input} placeholder=" " value={nombre} onChangeText={setNombre} />
          </View>
        )}

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput style={styles.input} placeholder=" " keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder=" " 
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={setPassword} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
                {showPassword ? '🔒 Ocultar' : '👁️ Ver'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isLogin && (
          <View style={styles.inputBlock}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder=" " 
                secureTextEntry={!showConfirmPassword} 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
                  {showConfirmPassword ? '🔒 Ocultar' : '👁️ Ver'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>{isLogin ? 'Entrar' : 'Registrarse y Continuar'}</Text>
      </TouchableOpacity>

      {!isLogin && (
        <>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O registrarte con</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={[styles.socialButton, { borderColor: COLORS.socialGoogle }]} 
              onPress={() => handleSocialAuth('Google')}
            >
              <Text style={[styles.socialButtonText, { color: COLORS.socialGoogle }]}>🌐 Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, { borderColor: COLORS.socialFacebook }]} 
              onPress={() => handleSocialAuth('Facebook')}
            >
              <Text style={[styles.socialButtonText, { color: COLORS.socialFacebook }]}>📘 Facebook</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchAuthModeButton}>
        <Text style={styles.switchAuthModeText}>
          {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


// advertencia de 3 meses sobre la suscripcion y la especialidad del trabajador

function RegisterTechnicalScreen({ route, navigation }) {
  const { nombre, email } = route.params || {};
  const [oficio, setOficio] = useState('');
  const [colonia, setColonia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [suscripcionActiva, setSuscripcionActiva] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSaveToFirebase = async () => {
    if (!oficio || !colonia || !telefono) {
      Alert.alert('Campos incompletos', 'Por favor ingresa oficio, colonia y teléfono.');
      return;
    }

    setLoading(true);
    try {
    
      const lat = 20.6296 + (Math.random() - 0.5) * 0.04;
      const lon = -87.0739 + (Math.random() - 0.5) * 0.04;

      await addDoc(collection(db, "trabajadores"), {
        nombre: nombre || 'Técnico TECCO',
        email: email || '',
        oficio: oficio,
        colonia: colonia,
        telefono: telefono,
        disponible: disponible,
        suscripcionActiva: suscripcionActiva,
        lat: lat,
        lon: lon,
        rating: '5.0',
        createdAt: new Date().toISOString()
      });

      setLoading(false);
      Alert.alert('¡Registrado en Firebase!', 'Tu perfil profesional ya está activo con tu prueba de 3 meses gratis.', [
        { text: 'Ver en el Mapa', onPress: () => navigation.navigate('Map', { role: 'trabajador' }) }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error al guardar', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.formTitle}>Perfil  & Suscripción</Text>
      <Text style={styles.formSubtitle}> </Text>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Oficio o Especialidad </Text>
        <TextInput style={styles.input} placeholder=" " value={oficio} onChangeText={setOficio} />
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Colonia / Fraccionamiento </Text>
        <TextInput style={styles.input} placeholder=" " value={colonia} onChangeText={setColonia} />
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Teléfono </Text>
        <TextInput style={styles.input} placeholder=" " keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.labelSwitch}>¿Estás disponible ahora?</Text>
        <Switch value={disponible} onValueChange={setDisponible} trackColor={{ true: COLORS.primary }} />
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠️ Aviso Importante de Suscripción</Text>
        <Text style={styles.warningText}>
          Al registrarte obtienes 3 meses de prueba totalmente gratis en TECC. Transcurrido ese periodo, deberás realizar el pago de tu suscripción mensual para continuar apareciendo en el mapa y recibir cotizaciones.
        </Text>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSaveToFirebase} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Guardar</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}


// pantalla para ver a trabajadores disponibles y el mapa general

function MapScreen({ route, navigation }) {
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.webPlaceholder}>
        <Text style={styles.brandTitle}>📍 Colaboradores</Text>
        <Text style={styles.webSubtitle}>Solidaridad, Quintana Roo</Text>

        <TouchableOpacity 
          style={styles.mapBannerCard} 
          onPress={() => navigation.navigate('FullMap', { trabajadores })}
        >
          <Text style={{ fontSize: 32 }}>🗺️</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.mapBannerTitle}>Ver Mapa General.</Text>
            <Text style={styles.mapBannerDesc}>Toca aquí para ver a mas colaboradores disponibles.</Text>
          </View>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : trabajadores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭 No hay trabajadores en este radio todavía.</Text>
            <Text style={styles.emptySubText}>Los registros nuevos desde Firebase aparecerán aquí.</Text>
          </View>
        ) : (
          trabajadores.map((item) => (
            <View key={item.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <Text style={styles.workerName}>{item.nombre}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: item.disponible ? '#E6F6F3' : '#FFEBEE', color: item.disponible ? COLORS.primary : '#D32F2F' }]}>
                  {item.disponible ? '🟢 Disponible' : '🔴 Ocupado'}
                </Text>
              </View>
              <Text style={styles.workerDetail}>{item.oficio} · Col. {item.colonia}</Text>
              <Text style={styles.workerPhone}>📞 {item.telefono}</Text>
              
              {item.suscripcionActiva && (
                <Text style={styles.proBadge}>⭐ Miembro TECCO PRO (Prueba Activa)</Text>
              )}

              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => navigation.navigate('RequestService', { worker: item })}
              >
                <Text style={styles.contactButtonText}>Solicitar Cotización</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}


// pantalla del mapa con los pines en tiempo real

function FullMapScreen({ route, navigation }) {
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
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      
      <View style={styles.mapCropWrapper}>
        <iframe
          title="Mapa de Playa del Carmen Dinámico"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          srcDoc={generateMapHtml()}
        />
      </View>

      <View style={styles.mapOverlayHeader}>
        <Text style={styles.mapHeaderTitle}>📍 Cobertura Playa del Carmen (10 km)</Text>
        <Text style={styles.mapHeaderSub}>Técnicos activos registrados en TECCO: {trabajadores.length}</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 10 }}>
          Pines de Técnicos Cercanos ({trabajadores.length}):
        </Text>

        {trabajadores.map((t) => (
          <View key={t.id} style={styles.mapPinCard}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: COLORS.secondary }}>{t.nombre} ({t.oficio})</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Colonia: {t.colonia} · {t.disponible ? '🟢 Disponible' : '🔴 Ocupado'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.pinButton}
              onPress={() => navigation.navigate('RequestService', { worker: t })}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Cotizar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}


// pantalla para la solicitud para el colaboradores

function RequestServiceScreen({ route, navigation }) {
  const { worker } = route.params || {};
  const [falla, setFalla] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnviarSolicitud = async () => {
    if (!falla || !direccion) {
      Alert.alert('Faltan datos', 'Describe la falla y anota tu dirección o referencia en Playa del Carmen.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "solicitudes_servicio"), {
        detalles_falla: `${worker?.oficio || 'Servicio'}: ${falla} (Dir: ${direccion})`,
        estado: "Pendiente",
        fecha_creacion: new Date().toISOString()
      });

      setLoading(false);
      Alert.alert('¡Solicitud Enviada!', `Tu cotización fue guardada en Firebase para ${worker?.nombre || 'el técnico'}.`, [
        { text: 'Aceptar', onPress: () => navigation.navigate('Map') }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo enviar la solicitud: ' + error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.formTitle}>Solicitar Servicio</Text>
      <Text style={styles.cotizTitle}>Cotización Para: {worker?.nombre} ({worker?.oficio})</Text>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Describe la falla o trabajo requerido *</Text>
        <TextInput 
          style={[styles.input, { height: 85, textAlignVertical: 'top' }]} 
          placeholder=" " 
          multiline
          value={falla} 
          onChangeText={setFalla} 
        />
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Dirección o punto de referencia en Playa del Carmen *</Text>
        <TextInput 
          style={styles.input} 
          placeholder=" " 
          value={direccion} 
          onChangeText={setDireccion} 
        />
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Adjuntar fotos o video de la falla</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => Alert.alert('Multimedia', 'Simulación: Archivo adjuntado correctamente.')}>
          <Text style={{ fontSize: 28, color: COLORS.primary }}>📎</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>Toca para subir evidencia</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleEnviarSolicitud} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Enviar Solicitud</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}


// 

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Loading"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Loading" component={LoadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GetStarted" component={GetStartedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ title: 'Seleccionar Perfil' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Iniciar Sesión / Registro' }} />
        <Stack.Screen name="RegisterTechnical" component={RegisterTechnicalScreen} options={{ title: 'Registro Profesional' }} />
        <Stack.Screen name="Map" component={MapScreen} options={{ title: '' }} />
        <Stack.Screen name="FullMap" component={FullMapScreen} options={{ title: 'Mapa de Playa del Carmen' }} />
        <Stack.Screen name="RequestService" component={RequestServiceScreen} options={{ title: 'Detalle de Solicitud' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// estilo de la interfaz

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  splashTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.white, letterSpacing: 2, marginTop: 10 },
  splashSubtitle: { fontSize: 15, color: COLORS.primary, marginTop: 5 },
  loadingWrapper: { marginTop: 40, alignItems: 'center' },
  loadingText: { color: COLORS.white, marginTop: 10, fontSize: 13 },

  getStartedContainer: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'space-between', alignItems: 'center' },
  getStartedContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 2, borderColor: COLORS.primary },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center', marginBottom: 12 },
  heroDescription: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 10, lineHeight: 20 },
  primaryButton: { backgroundColor: COLORS.primary, width: '100%', paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 25, marginBottom: 15 },
  primaryButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  roleContainer: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  roleTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center', marginBottom: 8 },
  roleSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 35 },
  roleCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder, elevation: 2 },
  roleIcon: { fontSize: 35, marginRight: 15 },
  roleTextContainer: { flex: 1 },
  roleCardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.secondary },
  roleCardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  authContainer: { padding: 28, backgroundColor: COLORS.white, flexGrow: 1, justifyContent: 'center' },
  authHeader: { alignItems: 'center', marginBottom: 25 },
  authTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.secondary, marginTop: 10 },
  authSubtitle: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  
  formFieldsGroup: { marginBottom: 10 },
  inputBlock: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, padding: 14, backgroundColor: COLORS.background, fontSize: 15 },

  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, backgroundColor: COLORS.background },
  passwordInput: { flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 12, color: COLORS.textSecondary, fontSize: 13 },

  socialRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, marginBottom: 20 },
  socialButton: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.white },
  socialButtonText: { fontWeight: 'bold', fontSize: 14 },

  switchAuthModeButton: { marginTop: 25, paddingVertical: 10, alignItems: 'center' },
  switchAuthModeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },

  formContainer: { padding: 24, backgroundColor: COLORS.white, flexGrow: 1 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center', marginBottom: 6 },
  formSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 25 },
  cotizTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 25 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12, backgroundColor: COLORS.background, padding: 14, borderRadius: 8 },
  labelSwitch: { fontSize: 14, fontWeight: 'bold', color: COLORS.secondary },

  warningCard: { marginTop: 18, padding: 16, backgroundColor: COLORS.warningBackground, borderRadius: 10, borderWidth: 1, borderColor: COLORS.warningBorder },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.warning, marginBottom: 6 },
  warningText: { fontSize: 13, color: '#5D4037', lineHeight: 18 },

  subCard: { marginTop: 16, padding: 16, backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.success },
  subDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  uploadBox: { borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 10, height: 100, justifyContent: 'center', alignItems: 'center', marginTop: 8, backgroundColor: COLORS.background },

  submitButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  submitButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  container: { flexGrow: 1, backgroundColor: COLORS.background },
  webPlaceholder: { flex: 1, padding: 20, alignItems: 'center' },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary, marginTop: 10, textAlign: 'center' },
  webSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 15, textAlign: 'center' },

  mapBannerCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, width: '100%', maxWidth: 450, marginBottom: 20, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, elevation: 3 },
  mapBannerTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.secondary },
  mapBannerDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },

  emptyContainer: { marginTop: 30, alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },

  workerCard: { backgroundColor: COLORS.white, padding: 16, borderRadius: 10, width: '100%', maxWidth: 450, marginBottom: 16, borderWidth: 1, borderColor: COLORS.cardBorder, elevation: 2 },
  workerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary },
  statusBadge: { fontSize: 11, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  workerDetail: { color: COLORS.textSecondary, marginTop: 6, fontSize: 14 },
  workerPhone: { color: COLORS.secondary, marginTop: 4, fontSize: 13, fontWeight: '500' },
  proBadge: { marginTop: 6, color: COLORS.warning, fontSize: 12, fontWeight: 'bold' },

  contactButton: { backgroundColor: COLORS.secondary, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 14 },
  contactButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },

  mapCropWrapper: {
    height: 320,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  mapOverlayHeader: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.cardBorder },
  mapHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary },
  mapHeaderSub: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  mapPinCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  pinButton: { backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
});