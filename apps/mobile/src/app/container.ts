import { diagnostico } from '@/shared/kernel/diagnostico';
import { EditarConsulta } from '@/modules/consultas/application/EditarConsulta';
import { EliminarConsulta } from '@/modules/consultas/application/EliminarConsulta';
import { ObtenerProximaCita } from '@/modules/consultas/application/ObtenerProximaCita';
import { ObtenerDetalleDeConsulta } from '@/modules/consultas/application/ObtenerDetalleDeConsulta';
import { GuardarDatosDeSalud } from '@/modules/auth/application/GuardarDatosDeSalud';
import { ObtenerDatosDeSalud } from '@/modules/auth/application/ObtenerDatosDeSalud';
import { FirestoreDatosDeSaludRepository } from '@/modules/auth/infrastructure/FirestoreDatosDeSaludRepository';
import { InMemoryDatosDeSaludRepository } from '@/modules/auth/infrastructure/InMemoryDatosDeSaludRepository';
import { DescartarConsultaPendiente } from '@/modules/consultas/application/DescartarConsultaPendiente';
import { EnviarConsultasPendientes } from '@/modules/consultas/application/EnviarConsultasPendientes';
import { GuardarConsultaNueva } from '@/modules/consultas/application/GuardarConsultaNueva';
import { ListarConsultasPendientes } from '@/modules/consultas/application/ListarConsultasPendientes';
import { ConectividadNetInfo } from '@/modules/consultas/infrastructure/ConectividadNetInfo';
import { DiarioConCopiaLocal } from '@/modules/consultas/infrastructure/DiarioConCopiaLocal';
import { SqliteColaDeEnvioRepository } from '@/modules/consultas/infrastructure/SqliteColaDeEnvioRepository';
import { SqliteCopiaLocal } from '@/modules/consultas/infrastructure/SqliteCopiaLocal';
import { ConsultasDeMedicosConCopiaLocal } from '@/modules/medicos/infrastructure/ConsultasDeMedicosConCopiaLocal';
import { MedicosConCopiaLocal } from '@/modules/medicos/infrastructure/MedicosConCopiaLocal';
import { ObtenerDetalleDeConsultaConCopiaLocal } from '@/modules/consultas/application/ObtenerDetalleDeConsultaConCopiaLocal';
import { ObtenerRecetaConCopiaLocal } from '@/modules/consultas/application/ObtenerRecetaConCopiaLocal';
import { CancelarInsistenciaDeToma } from '@/modules/consultas/application/CancelarInsistenciaDeToma';
import { DeshacerToma } from '@/modules/consultas/application/DeshacerToma';
import { ObtenerTomasDeHoy } from '@/modules/consultas/application/ObtenerTomasDeHoy';
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
import { archivosNativos } from '@/modules/consultas/infrastructure/archivosNativos';
import { CacheDeFotosEnDisco } from '@/modules/consultas/infrastructure/CacheDeFotosEnDisco';
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
import { ActivarCandado } from '@/modules/auth/application/ActivarCandado';
import { DesactivarCandado } from '@/modules/auth/application/DesactivarCandado';
import { DesbloquearConBiometria } from '@/modules/auth/application/DesbloquearConBiometria';
import { ObtenerEstadoDelCandado } from '@/modules/auth/application/ObtenerEstadoDelCandado';
import { usuarioActivoId } from '@/modules/auth/domain/UsuarioActivo';
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
import { ExpoBiometria } from '@/modules/auth/infrastructure/ExpoBiometria';
import { SecurePreferenciaDelCandado } from '@/modules/auth/infrastructure/SecurePreferenciaDelCandado';
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
  // Al cerrar sesión o eliminar la cuenta también se limpian la copia de lectura y la cola de envío del teléfono (RNF-11, privacidad).
  // Candado con Face ID (F036): se guarda por teléfono; al cerrar sesión se olvida para que la siguiente cuenta decida por sí misma.
  const preferenciaDelCandado = new SecurePreferenciaDelCandado();
  const biometria = new ExpoBiometria();
  // Fotos de recetas guardadas en el teléfono (F051): son datos de salud, así que también se vacían al cerrar sesión y al eliminar la cuenta.
  const cacheDeFotos = new CacheDeFotosEnDisco(archivosNativos);
  const sesionesConAvisos = new SesionQueCancelaAvisos(sesiones, avisos, [() => copiaLocal.limpiar(), () => colaDeEnvio.vaciar(), () => preferenciaDelCandado.limpiar(), () => cacheDeFotos.limpiar()]);
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
  diagnostico.informar(`modo: ${modo === 'firebase' ? 'Firebase real' : 'SIMULADO (no se guarda nada en la nube)'}`);

  const datosRemotos = firebase ? new FirestoreEliminadorDeDatos(firebase.firestore, firebase.storage) : new SimulatedEliminadorDeDatos();

  // Los datos del usuario viven bajo su uid. La fuente de verdad es Firebase Auth (la identidad que ven las reglas, F039);
  // si la sesión guardada en el dispositivo dice otro uid, no se consulta nada (SesionDesfasadaError).
  const usuarioId = async () => usuarioActivoId(await sesiones.leer(), firebase?.auth.currentUser?.uid ?? null);
  // Sin internet (RNF-11): el teléfono guarda una copia de lo último que vio (Diario, médicos) y una cola de consultas por enviar.
  const copiaLocal = new SqliteCopiaLocal(abrirBaseSqliteNativa, usuarioId);
  const colaDeEnvio = new SqliteColaDeEnvioRepository(abrirBaseSqliteNativa, usuarioId);
  const conectividad = new ConectividadNetInfo();

  const medicos = firebase ? new MedicosConCopiaLocal(new FirestoreMedicosRepository(firebase.firestore, usuarioId), copiaLocal, conectividad) : new InMemoryMedicosRepository();
  const consultas = firebase
    ? new ConsultasDeMedicosConCopiaLocal(new FirestoreConsultasDeMedicosRepository(firebase.firestore, usuarioId), copiaLocal, conectividad)
    : new InMemoryConsultasDeMedicosRepository();
  const lugares = firebase ? new FirestoreLugaresRepository(firebase.firestore, usuarioId) : new InMemoryLugaresRepository();

  // Borrador de la consulta: en SQLite local (nunca en la nube). Eliminar la cuenta lo borra también.
  const borradores = new SqliteBorradorRepository(abrirBaseSqliteNativa, usuarioId);
  const datos = new EliminadorConBorradores(datosRemotos, borradores, cacheDeFotos);
  const visitas = firebase ? new FirestoreConsultasRepository(firebase.firestore, usuarioId) : new InMemoryConsultasRepository();

  const indicaciones = firebase ? new FirestoreIndicacionesRepository(firebase.firestore, usuarioId) : new InMemoryIndicacionesRepository();

  const datosDeSalud = firebase ? new FirestoreDatosDeSaludRepository(firebase.firestore, usuarioId) : new InMemoryDatosDeSaludRepository();
  const registroDeTomas = firebase ? new FirestoreRegistroDeTomasRepository(firebase.firestore, usuarioId) : new InMemoryRegistroDeTomasRepository();
  const recordatoriosDeToma = firebase ? new FirestoreRecordatoriosDeTomaRepository(firebase.firestore, usuarioId) : new InMemoryRecordatoriosDeTomaRepository();
  const recetas = firebase ? new FirestoreRecetaRepository(firebase.firestore, usuarioId) : new InMemoryRecetaRepository();

  const fotos = firebase?.storage ? new FirestoreFotoDeRecetaRepository(firebase.firestore, firebase.storage, usuarioId, cacheDeFotos, conectividad) : new InMemoryFotoDeRecetaRepository();

  const diario = firebase ? new DiarioConCopiaLocal(new FirestoreDiarioRepository(firebase.firestore, usuarioId), copiaLocal, conectividad) : new InMemoryDiarioRepository();

  const detalle = firebase ? new FirestoreDetalleDeConsultaRepository(firebase.firestore, usuarioId) : new InMemoryDetalleDeConsultaRepository();

  const proximasCitas = firebase ? new FirestoreProximaCitaRepository(firebase.firestore, usuarioId) : new InMemoryProximaCitaRepository();

  const registrarConsulta = new RegistrarConsulta(
    visitas,
    new MedicosParaConsultaDeMedicos(medicos, generarId),
    new LugaresParaConsultaDeMedicos(lugares, generarId),
    generarId,
    () => new Date(),
  );

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
    // El detalle y la receta ya abiertos se leen sin internet desde una copia local (F032).
    obtenerDetalleDeConsulta: new ObtenerDetalleDeConsultaConCopiaLocal(new ObtenerDetalleDeConsulta(detalle, indicaciones, new ContactoDeMedicoDelDirectorio(medicos)), copiaLocal, conectividad),
    listarDiario: new ListarDiario(diario),
    // Indicaciones de una consulta ya guardada: se marcan y agregan en el detalle (F015).
    listarIndicaciones: new ListarIndicaciones(indicaciones),
    agregarIndicacion: new AgregarIndicacion(indicaciones, generarId),
    alternarIndicacion: new AlternarIndicacion(indicaciones, () => new Date()),
    quitarIndicacion: new QuitarIndicacion(indicaciones),
    // Receta (medicamentos) de una consulta ya guardada (F017).
    obtenerReceta: new ObtenerRecetaConCopiaLocal(new ObtenerReceta(recetas), copiaLocal, conectividad),
    guardarReceta: new GuardarReceta(recetas, recordatoriosDeToma, () => new Date()),
    // Recordatorios de toma (F024, RF-32): avisos locales a la hora de cada toma.
    sincronizarAvisosDeTomas: new SincronizarAvisosDeTomas(recordatoriosDeToma, avisos, registroDeTomas, () => new Date()),
    // Botones del aviso de toma (F027): «Ya la tomé» (se registra en doseLogs) y «Recordar en 5 min»; abrir el aviso quita la insistencia.
    registrarToma: new RegistrarToma(registroDeTomas, avisos, () => new Date()),
    posponerToma: new PosponerToma(avisos, () => new Date()),
    cancelarInsistenciaDeToma: new CancelarInsistenciaDeToma(avisos),
    // Tarjeta «Hoy» del Diario (F029): las tomas del día con su estado; marcar (registrarToma) y deshacer.
    obtenerTomasDeHoy: new ObtenerTomasDeHoy(recordatoriosDeToma, registroDeTomas, () => new Date()),
    deshacerToma: new DeshacerToma(registroDeTomas),
    // Foto de la receta (F016): cámara o galería → Storage.
    adjuntarFotoDeReceta: new AdjuntarFotoDeReceta(new SelectorDeFotoExpo(), fotos),
    obtenerFotoDeReceta: new ObtenerFotoDeReceta(fotos),
    quitarFotoDeReceta: new QuitarFotoDeReceta(fotos),
    guardarBorrador: new GuardarBorrador(borradores),
    recuperarBorrador: new RecuperarBorrador(borradores),
    descartarBorrador: new DescartarBorrador(borradores),
    registrarConsulta,
    // Guardar sin internet (RNF-11, F030): la consulta nueva se envía de una vez o, sin internet, queda en la cola del teléfono.
    guardarConsultaNueva: new GuardarConsultaNueva(registrarConsulta, colaDeEnvio, conectividad, generarId, () => new Date()),
    enviarConsultasPendientes: new EnviarConsultasPendientes(colaDeEnvio, registrarConsulta, conectividad),
    listarConsultasPendientes: new ListarConsultasPendientes(colaDeEnvio),
    descartarConsultaPendiente: new DescartarConsultaPendiente(colaDeEnvio),
    conectividad,
    listarDirectorio: new ListarDirectorio(medicos, consultas),
    obtenerDetalleDeMedico: new ObtenerDetalleDeMedico(medicos, consultas),
    resumenDePerfil: new ResumenDePerfil(medicos, consultas),
    // Datos de salud del propio usuario (F028, RF-02): se llenan con el tiempo desde el Perfil.
    obtenerDatosDeSalud: new ObtenerDatosDeSalud(datosDeSalud),
    guardarDatosDeSalud: new GuardarDatosDeSalud(datosDeSalud, () => new Date()),
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
    // Candado con Face ID / huella (F036).
    obtenerEstadoDelCandado: new ObtenerEstadoDelCandado(preferenciaDelCandado, biometria),
    activarCandado: new ActivarCandado(preferenciaDelCandado, biometria),
    desactivarCandado: new DesactivarCandado(preferenciaDelCandado),
    desbloquearConBiometria: new DesbloquearConBiometria(biometria),
    iniciarSesionConGoogle: new IniciarSesionConGoogle(identidad, auth, sesiones),
    obtenerSesionActual: new ObtenerSesionActual(sesiones, identidad, auth),
    aceptarAvisoDePrivacidad: new AceptarAvisoDePrivacidad(sesiones, consentimientos),
    consultarConsentimientosPendientes: new ConsultarConsentimientosPendientes(consentimientos),
    cerrarSesion: new CerrarSesion(sesionesConAvisos, auth, identidad),
    eliminarCuenta: new EliminarCuenta(sesionesConAvisos, datos, auth, identidad),
  };
}

export type Container = ReturnType<typeof crearContainer>;
