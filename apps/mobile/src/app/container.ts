import { RegistrarConsulta } from '@/modules/consultas/application/RegistrarConsulta';
import { LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from '@/modules/consultas/infrastructure/adaptadoresDeMedicos';
import { FirestoreConsultasRepository } from '@/modules/consultas/infrastructure/FirestoreConsultasRepository';
import { InMemoryConsultasRepository } from '@/modules/consultas/infrastructure/InMemoryConsultasRepository';
import { AgregarLugar } from '@/modules/medicos/application/AgregarLugar';
import { EliminarLugar } from '@/modules/medicos/application/EliminarLugar';
import { EliminarMedico } from '@/modules/medicos/application/EliminarMedico';
import { GuardarMedico } from '@/modules/medicos/application/GuardarMedico';
import { ListarLugares } from '@/modules/medicos/application/ListarLugares';
import { BuscarMedicosParaElegir } from '@/modules/medicos/application/BuscarMedicosParaElegir';
import { ElegirMedicoGuardado } from '@/modules/medicos/application/ElegirMedicoGuardado';
import { ListarLugaresUsadosAntes } from '@/modules/medicos/application/ListarLugaresUsadosAntes';
import { ListarDirectorio } from '@/modules/medicos/application/ListarDirectorio';
import { ObtenerDetalleDeMedico } from '@/modules/medicos/application/ObtenerDetalleDeMedico';
import { ResumenDePerfil } from '@/modules/medicos/application/ResumenDePerfil';
import { ObtenerMedico } from '@/modules/medicos/application/ObtenerMedico';
import { RenombrarLugar } from '@/modules/medicos/application/RenombrarLugar';
import { FirestoreConsultasDeMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository';
import { InMemoryConsultasDeMedicosRepository } from '@/modules/medicos/infrastructure/InMemoryConsultasDeMedicosRepository';
import { FirestoreLugaresRepository } from '@/modules/medicos/infrastructure/FirestoreLugaresRepository';
import { FirestoreMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreMedicosRepository';
import { InMemoryLugaresRepository, InMemoryMedicosRepository } from '@/modules/medicos/infrastructure/InMemoryMedicosRepository';
import { generarId } from '@/shared/kernel/generarId';
import { AceptarAvisoDePrivacidad } from '@/modules/auth/application/AceptarAvisoDePrivacidad';
import { CerrarSesion } from '@/modules/auth/application/CerrarSesion';
import { ConsultarConsentimientosPendientes } from '@/modules/auth/application/ConsultarConsentimientosPendientes';
import { EliminarCuenta } from '@/modules/auth/application/EliminarCuenta';
import { IniciarSesionConGoogle } from '@/modules/auth/application/IniciarSesionConGoogle';
import { ObtenerSesionActual } from '@/modules/auth/application/ObtenerSesionActual';
import { RegistrarCuenta } from '@/modules/auth/application/RegistrarCuenta';
import { configuracionDeFirebase, obtenerFirebase } from '@/modules/auth/infrastructure/firebase';
import { FirebaseAuthRepository } from '@/modules/auth/infrastructure/FirebaseAuthRepository';
import { FirebaseServicioIdentidad } from '@/modules/auth/infrastructure/FirebaseServicioIdentidad';
import { FirestoreEliminadorDeDatos } from '@/modules/auth/infrastructure/FirestoreEliminadorDeDatos';
import { FirestoreCuentasRepository } from '@/modules/auth/infrastructure/FirestoreCuentasRepository';
import { FirestoreConsentimientosRepository } from '@/modules/auth/infrastructure/FirestoreConsentimientosRepository';
import { GoogleProveedorDeIdentidad } from '@/modules/auth/infrastructure/GoogleProveedorDeIdentidad';
import { InMemoryConsentimientosRepository } from '@/modules/auth/infrastructure/InMemoryConsentimientosRepository';
import { crearClienteGoogleNativo } from '@/modules/auth/infrastructure/NativeClienteGoogle';
import { SecureSesionStore } from '@/modules/auth/infrastructure/SecureSesionStore';
import { SimulatedAuthRepository } from '@/modules/auth/infrastructure/SimulatedAuthRepository';
import { SimulatedEliminadorDeDatos } from '@/modules/auth/infrastructure/SimulatedEliminadorDeDatos';
import { SimulatedProveedorDeIdentidad } from '@/modules/auth/infrastructure/SimulatedProveedorDeIdentidad';

/** Google real si hay ID de cliente y módulo nativo (development build); si no, simulado (Expo Go). */
function crearIdentidad() {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const cliente = iosClientId
    ? crearClienteGoogleNativo({ iosClientId, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })
    : null;
  return cliente
    ? { identidad: new GoogleProveedorDeIdentidad(cliente), esReal: true }
    : { identidad: new SimulatedProveedorDeIdentidad(), esReal: false };
}

/** Firebase (Auth + Firestore) solo con Google real y configuración presente; si no, modo simulado. */
function crearFirebase(googleEsReal: boolean) {
  const config = googleEsReal ? configuracionDeFirebase() : null;
  return config ? obtenerFirebase(config) : null;
}

/** Composition root: único lugar que conoce las clases concretas de infraestructura. */
export function crearContainer() {
  const sesiones = new SecureSesionStore();
  const { identidad, esReal } = crearIdentidad();
  const firebase = crearFirebase(esReal);

  const auth = firebase
    ? new FirebaseAuthRepository(
        new FirebaseServicioIdentidad(firebase.auth),
        new RegistrarCuenta(new FirestoreCuentasRepository(firebase.firestore)),
      )
    : new SimulatedAuthRepository();
  const consentimientos = firebase
    ? new FirestoreConsentimientosRepository(firebase.firestore)
    : new InMemoryConsentimientosRepository();

  const modo = firebase ? ('firebase' as const) : ('simulado' as const);
  console.log(`[MediQ] modo: ${modo === 'firebase' ? 'Firebase real' : 'SIMULADO (no se guarda nada en la nube)'}`);

  const datos = firebase ? new FirestoreEliminadorDeDatos(firebase.firestore) : new SimulatedEliminadorDeDatos();

  // Los datos del usuario viven bajo su uid: se lee de la sesión guardada en el dispositivo.
  const usuarioId = async () => {
    const sesion = await sesiones.leer();
    if (!sesion) throw new Error('No hay sesión activa');
    return sesion.usuario.id;
  };
  const medicos = firebase ? new FirestoreMedicosRepository(firebase.firestore, usuarioId) : new InMemoryMedicosRepository();
  const consultas = firebase
    ? new FirestoreConsultasDeMedicosRepository(firebase.firestore, usuarioId)
    : new InMemoryConsultasDeMedicosRepository();
  const lugares = firebase ? new FirestoreLugaresRepository(firebase.firestore, usuarioId) : new InMemoryLugaresRepository();

  const visitas = firebase ? new FirestoreConsultasRepository(firebase.firestore, usuarioId) : new InMemoryConsultasRepository();

  return {
    modo,
    registrarConsulta: new RegistrarConsulta(
      visitas,
      new MedicosParaConsultaDeMedicos(medicos, generarId),
      new LugaresParaConsultaDeMedicos(lugares, generarId),
      generarId,
      () => new Date(),
    ),
    listarDirectorio: new ListarDirectorio(medicos, consultas),
    obtenerDetalleDeMedico: new ObtenerDetalleDeMedico(medicos, consultas),
    resumenDePerfil: new ResumenDePerfil(medicos, consultas),
    buscarMedicosParaElegir: new BuscarMedicosParaElegir(medicos, consultas),
    elegirMedicoGuardado: new ElegirMedicoGuardado(medicos, consultas),
    listarLugaresUsadosAntes: new ListarLugaresUsadosAntes(lugares),
    obtenerMedico: new ObtenerMedico(medicos),
    guardarMedico: new GuardarMedico(medicos, generarId),
    eliminarMedico: new EliminarMedico(medicos),
    listarLugares: new ListarLugares(lugares),
    agregarLugar: new AgregarLugar(lugares, generarId),
    renombrarLugar: new RenombrarLugar(lugares),
    eliminarLugar: new EliminarLugar(lugares),
    iniciarSesionConGoogle: new IniciarSesionConGoogle(identidad, auth, sesiones),
    obtenerSesionActual: new ObtenerSesionActual(sesiones, identidad, auth),
    aceptarAvisoDePrivacidad: new AceptarAvisoDePrivacidad(sesiones, consentimientos),
    consultarConsentimientosPendientes: new ConsultarConsentimientosPendientes(consentimientos),
    cerrarSesion: new CerrarSesion(sesiones, auth, identidad),
    eliminarCuenta: new EliminarCuenta(sesiones, datos, auth, identidad),
  };
}

export type Container = ReturnType<typeof crearContainer>;
