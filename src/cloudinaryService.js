import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export class CloudinaryService {
  // Función para subir una imagen seleccionada a Cloudinary
  static async subirImagen(archivoImagen) {
    try {
      const formData = new FormData();
      formData.append('file', archivoImagen);
      formData.append('upload_preset', 'ev8iljp8');

      const response = await fetch('https://api.cloudinary.com/v1_1/izyf7yyj/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const jsonData = await response.json();
        return jsonData.secure_url;
      } else {
        console.error(`Error al subir a Cloudinary: ${response.status}`);
        return null;
      }
    } catch (e) {
      console.error(`Excepción al subir imagen: ${e}`);
      return null;
    }
  }

  // Función para registrar usuario guardando la URL de la INE en Firestore
  static async registrarUsuarioConImagen({ correo, nombre, archivoImagenINE }) {
    try {
      const urlImagen = await this.subirImagen(archivoImagenINE);

      if (!urlImagen) {
        throw new Error('No se pudo obtener la URL de la imagen');
      }

      await addDoc(collection(db, 'clientes'), {
        email: correo,
        nombre: nombre,
        ine_url: urlImagen,
        fecha_registro: serverTimestamp(),
      });

      console.log('¡Usuario registrado y foto guardada con éxito en Firestore!');
      return true;
    } catch (e) {
      console.error(`Error en el registro: ${e}`);
      throw e;
    }
  }
}