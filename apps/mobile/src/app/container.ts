import { EditarConsulta } from '@/modules/consultas/application/EditarConsulta';
import { EliminarConsulta } from '@/modules/consultas/application/EliminarConsulta';
import { ObtenerProximaCita } from '@/modules/consultas/application/ObtenerProximaCita';
import { ObtenerDetalleDeConsulta } from '@/modules/consultas/application/ObtenerDetalleDeConsulta';
import { CancelarInsistenciaDeToma } from '@/modules/consultas/application/CancelarInsistenciaDeToma';
import { PosponerToma } from '@/modules/consultas/application/PosponerToma';
import { RegistrarToma } from '@/modules/consultas/application/RegistrarToma';
import { SincronizarAvisosDeTomas } from '@/modules/consultas/application/SincronizarAvisosDeTomas';
import { SincronizarAvisosDeCitas } from '@/modules/consultas/application/SincronizarAvisosDeCitas';
import { SolicitarPermisoDeAvisos } from '@/modules/consultas/application/SolicitarPermisoDeAvisos';
import { CargarTodoElDiario } from '@/modules/consultas/application/CargarTodoElDiario';
import { ListarDiario } from '@/modules/consultas/application/ListarDiario';
import { AgregarIndicacion } from '@/modules/consultas/application/AgregarIndicacion';
import { AlternarIndicacion } from '@/modules/consultas/application/AlternarIndicacion';
import { AdjuntarFotoDeReceta } from '@/modules/consultas/application/AdjuntarFotoDeReceta';
import { ObtenerFotoDeReceta } from '@/modules/consultas/application/ObtenerFotoDeReceta';
import { QuitarFotoDeReceta } from '@/modules/consultas/application/QuitarFotoDeReceta';
import { GuardarReceta } from '@/modules/consultas/application/GuardarReceta';
import { ObtenerReceta } from '@/modules/consultas/application/ObtenerReceta';
import { ListarIndicaciones } from '@/modules/consultas/application/ListarIndicaciones';
import { QuitarIndicacion } from '@/modules/consultas/application/QuitarIndicacion';
import { DescartarBorrador } from '@/modules/consultas/application/DescartarBorrador';
import { GuardarBorrador } from '@/modules/consultas/application/GuardarBorrador';
import { RecuperarBorrador } from '@/modules/consultas/application/RecuperarBorrador';
import { RegistrarConsulta } from '@/modules/consultas/application/RegistrarConsulta';
import { ContactoDeMedicoDelDirectorio, LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from '@/modules/consultas/infrastructure/adaptadoresDeMedicos';
import { abrirBaseSqliteNativa } from '@/modules/consultas/infrastructure/baseSqliteNativa';
import { EliminadorConBorradores } from '@/modules/consultas/infrastructure/EliminadorConBorradores';
import { SqliteBorradorRepository } from '@/modules/consultas/infrastructure/SqliteBorradorRepository';
import { FirestoreConsultasRepository } from '@/modules/consultas/infrastructure/FirestoreConsultasRepository';
import { FirestoreProximaCitaRepository } from '@/modules/consultas/infrastructure/FirestoreProximaCitaRepository';
import { InMemoryProximaCitaRepository } from '@/modules/consultas/infrastructure/InMemoryProximaCitaRepository';
import { FirestoreDetalleDeConsultaRepository } from '@/modules/consultas/infrastructure/FirestoreDetalleDeConsultaRepository';
import { InMemoryDetalleDeConsultaRepository } from '@/modules/consultas/infrastructure/InMemoryDetalleDeConsultaRepository';
import { FirestoreDiarioRepository } from '@/modules/consultas/infrastructure/FirestoreDiarioRepository';
import { InMemoryDiarioRepository } from '@/modules/consultas/infrastructure/InMemoryDiarioRepository';
import { FirestoreIndicacionesRepository } from '@/modules/consultas/infrastructure/FirestoreIndicacionesRepository';
import { FirestoreFotoDeRecetaRepository } from '@/modules/consultas/infrastructure/FirestoreFotoDeRecetaRepository';
import { InMemoryFotoDeRecetaRepository } from '@/modules/consultas/infrastructure/InMemoryFotoDeRecetaRepository';
import { ProgramadorDeAvisosExpo } from '@/modules/consultas/infrastructure/ProgramadorDeAvisosExpo';
import { SesionQueCancelaAvisos } from '@/modules/consultas/infrastructure/SesionQueCancelaAvisos';
import { SelectorDeFotoExpo } from '@/modules/consultas/infrastructure/SelectorDeFotoExpo';
import { FirestoreRecordatoriosDeTomaRepository } from '@/modules/consultas/infrastructure/FirestoreRecordatoriosDeTomaRepository';
import { FirestoreRegistroDeTomasRepository } from '@/modules/consultas/infrastructure/FirestoreRegistroDeTomasRepository';
import { InMemoryRegistroDeTomasRepository } from '@/modules/consultas/infrastructure/InMemoryRegistroDeTomasRepository';
import { InMemoryRecordatoriosDeTomaRepository } from '@/modules/consultas/infrastructure/InMemoryRecordatoriosDeTomaRepository';
import { FirestoreRecetaRepository } from '@/modules/consultas/infrastructure/FirestoreRecetaRepository';
import { InMemoryRecetaRepository } from '@/modules/consultas/infrastructure/InMemoryRecetaRepository';
import { InMemoryIndicacionesRepository } from '@/modules/consultas/infrastructure/InMemoryIndicacionesRepository';
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
  // Avisos de próxima cita (F021, RF-40): notificaciones locales; al cerrar sesión o eliminar la cuenta se cancelan.
  const avisos = new ProgramadorDeAvisosExpo();
  const sesionesConAvisos = new SesionQueCancelaAvisos(sesiones, avisos);
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

  const datosRemotos = firebase ? new FirestoreEliminadorDeDatos(firebase.firestore, firebase.storage) : new SimulatedEliminadorDeDatos();

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

  // Borrador de la consulta: en SQLite local (nunca en la nube). Eliminar la cuenta lo borra también.
  const borradores = new SqliteBorradorRepository(abrirBaseSqliteNativa, usuarioId);
  const datos = new EliminadorConBorradores(datosRemotos, borradores);
  const visitas = firebase ? new FirestoreConsultasRepository(firebase.firestore, usuarioId) : new InMemoryConsultasRepository();

  const indicaciones = firebase ? new FirestoreIndicacionesRepository(firebase.firestore, usuarioId) : new InMemoryIndicacionesRepository();

  const registroDeTomas = firebase ? new FirestoreRegistroDeTomasRepository(firebase.firestore, usuarioId) : new InMemoryRegistroDeTomasRepository();
  const recordatoriosDeToma = firebase ? new FirestoreRecordatoriosDeTomaRepository(firebase.firestore, usuarioId) : new InMemoryRecordatoriosDeTomaRepository();
  const recetas = firebase ? new FirestoreRecetaRepository(firebase.firestore, usuarioId) : new InMemoryRecetaRepository();

  const fotos = firebase?.storage ? new FirestoreFotoDeRecetaRepository(firebase.firestore, firebase.storage, usuarioId) : new InMemoryFotoDeRecetaRepository();

  const diario = firebase ? new FirestoreDiarioRepository(firebase.firestore, usuarioId) : new InMemoryDiarioRepository();

  const detalle = firebase ? new FirestoreDetalleDeConsultaRepository(firebase.firestore, usuarioId) : new InMemoryDetalleDeConsultaRepository();

  const proximasCitas = firebase ? new FirestoreProximaCitaRepository(firebase.firestore, usuarioId) : new InMemoryProximaCitaRepository();

  return {
    modo,
    editarConsulta: new EditarConsulta(visitas, detalle, new MedicosParaConsultaDeMedicos(medicos, generarId), new LugaresParaConsultaDeMedicos(lugares, generarId), () => new Date()),
    eliminarConsulta: new EliminarConsulta(visitas, detalle, recordatoriosDeToma),
    obtenerProximaCita: new ObtenerProximaCita(proximasCitas, () => new Date()),
    // Búsqueda (F020, RF-17): se lee todo el diario y se filtra en el dispositivo.
    cargarTodoElDiario: new CargarTodoElDiario(diario),
    // Avisos de próxima cita (F021, RF-40).
    sincronizarAvisosDeCitas: new SincronizarAvisosDeCitas(proximasCitas, avisos, () => new Date()),
    solicitarPermisoDeAvisos: new SolicitarPermisoDeAvisos(avisos),
    obtenerDetalleDeConsulta: new ObtenerDetalleDeConsulta(detalle, indicaciones, new ContactoDeMedicoDelDirectorio(medicos)),
    listarDiario: new ListarDiario(diario),
    // Indicaciones de una consulta ya guardada: se marcan y agregan en el detalle (F015).
    listarIndicaciones: new ListarIndicaciones(indicaciones),
    agregarIndicacion: new AgregarIndicacion(indicaciones, generarId),
    alternarIndicacion: new AlternarIndicacion(indicaciones, () => new Date()),
    quitarIndicacion: new QuitarIndicacion(indicaciones),
    // Receta (medicamentos) de una consulta ya guardada (F017).
    obtenerReceta: new ObtenerReceta(recetas),
    guardarReceta: new GuardarReceta(recetas, recordatoriosDeToma, () => new Date()),
    // Recordatorios de toma (F024, RF-32): avisos locales a la hora de cada toma.
    sincronizarAvisosDeTomas: new SincronizarAvisosDeTomas(recordatoriosDeToma, avisos, registroDeTomas, () => new Date()),
    // Botones del aviso de toma (F027): «Ya la tomé» (se registra en doseLogs) y «Recordar en 5 min»; abrir el aviso quita la insistencia.
    registrarToma: new RegistrarToma(registroDeTomas, avisos, () => new Date()),
    posponerToma: new PosponerToma(avisos, () => new Date()),
    cancelarInsistenciaDeToma: new CancelarInsistenciaDeToma(avisos),
    // Foto de la receta (F016): cámara o galería → Storage.
    adjuntarFotoDeReceta: new AdjuntarFotoDeReceta(new SelectorDeFotoExpo(), fotos),
    obtenerFotoDeReceta: new ObtenerFotoDeReceta(fotos),
    quitarFotoDeReceta: new QuitarFotoDeReceta(fotos),
    guardarBorrador: new GuardarBorrador(borradores),
    recuperarBorrador: new RecuperarBorrador(borradores),
    descartarBorrador: new DescartarBorrador(borradores),
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
    cerrarSesion: new CerrarSesion(sesionesConAvisos, auth, identidad),
    eliminarCuenta: new EliminarCuenta(sesionesConAvisos, datos, auth, identidad),
  };
}

export type Container = ReturnType<typeof crearContainer>;
