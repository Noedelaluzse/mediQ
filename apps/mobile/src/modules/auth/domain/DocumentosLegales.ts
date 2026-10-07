import { DOCUMENTOS, VERSIONES_VIGENTES, type Documento } from './Consentimiento';

/**
 * Quién responde por los datos (lo exige la ley mexicana de protección de datos personales). Si cambia, cambian el aviso y los términos
 * y hay que subir su versión en `Consentimiento.ts` para que la app pida aceptarlos otra vez.
 */
export const RESPONSABLE = {
  nombre: 'Noe De la Luz',
  ubicacion: 'Cancún, Quintana Roo, México',
  correo: 'noedelaluz06@gmail.com',
} as const;

export interface SeccionLegal {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  documento: Documento;
  titulo: string;
  /** La de `VERSIONES_VIGENTES`: es la que queda registrada en el recibo de consentimiento. */
  version: string;
  introduccion: string;
  secciones: SeccionLegal[];
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;

/** «2026-10-06» → «6 de octubre de 2026». */
export const etiquetaDeVersion = (version: string): string => {
  const [a, m, d] = version.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

/** Todo el texto de un documento seguido (para buscar en él en las pruebas). */
export const textoCompleto = (d: DocumentoLegal): string => [d.titulo, d.introduccion, ...d.secciones.flatMap((s) => [s.titulo, ...s.parrafos])].join('\n');

const AVISO: DocumentoLegal = {
  documento: 'aviso_privacidad',
  titulo: 'Aviso de privacidad',
  version: VERSIONES_VIGENTES.aviso_privacidad,
  introduccion:
    'Este aviso explica quién guarda tus datos en MediQ, cuáles son, para qué se usan y qué puedes hacer con ellos. Está escrito en lenguaje sencillo porque tus datos de salud son importantes.',
  secciones: [
    {
      titulo: 'Quién es el responsable de tus datos',
      parrafos: [
        `El responsable de tus datos personales es ${RESPONSABLE.nombre}, con domicilio en ${RESPONSABLE.ubicacion}.`,
        `Para cualquier asunto de privacidad puedes escribirle a ${RESPONSABLE.correo}.`,
      ],
    },
    {
      titulo: 'Qué datos guardamos',
      parrafos: [
        'Datos de tu cuenta: tu nombre, tu correo y un identificador, que vienen de tu cuenta de Google cuando inicias sesión. No guardamos tu contraseña de Google.',
        'Datos personales sensibles de salud que tú registras: tus consultas (fecha, especialidad, motivo, lo que te dijo el médico, tus indicaciones y tu próxima cita), tus recetas (medicamentos, dosis, frecuencia, duración y la foto de la receta, si decides agregarla), el registro de las tomas de tus medicinas y los datos de tu perfil de salud (fecha de nacimiento, sexo, tipo de sangre, alergias y alergias a medicamentos).',
        'Datos de las personas y lugares que te atienden: el nombre, la especialidad, el teléfono, la cédula y las notas de tus médicos, y el nombre de los lugares donde te atienden. Los escribes tú.',
        'Casi todo es opcional: solo pedimos lo mínimo para guardar una consulta. No recabamos tu ubicación ni tus contactos, y solo usamos la cámara o la galería para la foto de la receta que tú elijas.',
      ],
    },
    {
      titulo: 'Para qué usamos tus datos',
      parrafos: [
        'Solo para darte el servicio que pides: guardar y mostrarte tu diario médico, tus médicos, tus recetas y tu perfil de salud, mantener tu cuenta y su seguridad, y enviarte avisos de tus citas y de tus medicinas. Esos avisos los programa tu propio teléfono; no salen de él.',
        'No usamos tus datos para publicidad, no los vendemos, no hacemos perfiles sobre ti y no los usamos para ningún otro fin. No hay finalidades secundarias.',
      ],
    },
    {
      titulo: 'Con quién se comparten tus datos',
      parrafos: [
        'No vendemos ni compartimos tus datos con otras personas o empresas para sus propios fines.',
        'Para funcionar, MediQ usa servicios de Google (Google Sign-In, Firebase Authentication, Cloud Firestore y Cloud Storage). Google guarda y procesa tus datos por cuenta del responsable, como proveedor de infraestructura. Esos servidores pueden estar fuera de México.',
        'Solo entregaremos tus datos a una autoridad si la ley nos lo exige.',
      ],
    },
    {
      titulo: 'Dónde se guardan y cómo los protegemos',
      parrafos: [
        'En la nube, dentro de tu cuenta de MediQ. Las reglas de seguridad permiten que solo tú, con tu sesión iniciada, leas y escribas tus datos, y Google cifra la información mientras viaja y mientras está guardada.',
        'En tu teléfono guardamos una copia de lo que ya viste y de las consultas que capturaste y aún no se han enviado, para que puedas usar la app sin internet. Está protegida por el bloqueo y el cifrado de tu teléfono, y se borra al cerrar sesión o al eliminar tu cuenta.',
        'Ningún sistema es perfecto. Si ocurre una vulneración de seguridad que afecte tus derechos, te lo informaremos.',
      ],
    },
    {
      titulo: 'Tus derechos y cómo ejercerlos',
      parrafos: [
        'Tienes derecho a acceder a tus datos, a rectificarlos si están mal, a cancelarlos y a oponerte a que se usen (derechos ARCO).',
        'Desde la app puedes ver y corregir lo que registraste, y eliminar tu cuenta con todos tus datos en Perfil, con la opción Eliminar mi cuenta y mis datos. Eso borra tus datos de la nube y de tu teléfono, y no se puede deshacer.',
        `Para cualquier otra solicitud, o si prefieres hacerla por escrito, escribe a ${RESPONSABLE.correo} con tu nombre, el correo de tu cuenta y lo que quieres. Te responderemos en un máximo de 20 días hábiles.`,
        'Si crees que tus derechos no fueron respetados, puedes acudir a la autoridad de protección de datos personales de México.',
      ],
    },
    {
      titulo: 'Cómo revocar tu consentimiento',
      parrafos: [
        `Puedes retirar tu consentimiento cuando quieras, eliminando tu cuenta desde la app o escribiendo a ${RESPONSABLE.correo}. Al hacerlo dejamos de usar tus datos y los borramos. Sin ellos, MediQ ya no puede funcionar para ti.`,
      ],
    },
    {
      titulo: 'Menores de edad',
      parrafos: ['MediQ no está dirigida a menores de 18 años. Si eres menor, úsala solo con el permiso y la supervisión de tu madre, tu padre o tu tutor.'],
    },
    {
      titulo: 'Cambios a este aviso',
      parrafos: ['Si este aviso cambia, publicaremos una versión nueva con su fecha y la app te pedirá aceptarla otra vez antes de seguir usando tus datos.'],
    },
    {
      titulo: 'Tu consentimiento expreso',
      parrafos: [
        'Tus datos de salud son datos personales sensibles, y para tratarlos necesitamos tu consentimiento expreso. Al marcar la casilla de aceptación declaras que leíste este aviso y nos autorizas a tratar tus datos personales, incluidos los sensibles de salud, como aquí se explica.',
        'Es necesario para usar MediQ. Si no estás de acuerdo, no la uses.',
      ],
    },
  ],
};

const TERMINOS: DocumentoLegal = {
  documento: 'terminos',
  titulo: 'Términos y condiciones',
  version: VERSIONES_VIGENTES.terminos,
  introduccion: 'Estas reglas explican cómo puedes usar MediQ. Al usarla aceptas lo que sigue. Léelas con calma: son cortas.',
  secciones: [
    {
      titulo: 'Qué es MediQ',
      parrafos: ['MediQ es un diario médico personal: te ayuda a guardar tus consultas, tus médicos, tus recetas y tus datos de salud, y a recordar tus citas y tus medicinas. Es una herramienta para organizarte.'],
    },
    {
      titulo: 'MediQ no es atención médica',
      parrafos: [
        'MediQ no da diagnósticos, tratamientos ni consejos médicos, y no sustituye a tu médico. Sigue siempre las indicaciones de tu médico.',
        'En una urgencia llama al 911 o acude a un hospital. No uses MediQ para eso.',
      ],
    },
    {
      titulo: 'Tu cuenta',
      parrafos: [
        'Entras con tu cuenta de Google. Eres responsable de lo que se haga con tu sesión y de mantener seguro tu teléfono.',
        'Debes tener 18 años o más, o usar MediQ con el permiso y la supervisión de tu madre, tu padre o tu tutor.',
      ],
    },
    {
      titulo: 'La información que registras',
      parrafos: [
        'Tú escribes tu información y eres responsable de que sea correcta y de mantenerla al día. MediQ no la revisa ni la confirma con tus médicos.',
        'Tus datos son tuyos: no reclamamos ningún derecho sobre ellos. Solo los usamos para darte el servicio, como explica el aviso de privacidad.',
      ],
    },
    {
      titulo: 'Avisos y recordatorios',
      parrafos: [
        'Los avisos de tus citas y de tus medicinas son una ayuda y pueden fallar. Por ejemplo, si tu teléfono está apagado, sin batería o en modo de no molestar, si desactivaste las notificaciones, o si pasas varios días sin abrir la app.',
        'No dependas solo de MediQ para tomar medicinas importantes ni para no perder una cita.',
      ],
    },
    {
      titulo: 'Uso aceptable',
      parrafos: ['No uses MediQ para nada ilegal, para intentar entrar a cuentas de otras personas, para dañar o saturar el servicio, ni para guardar información de otra persona sin su permiso.'],
    },
    {
      titulo: 'Disponibilidad del servicio',
      parrafos: [
        'Hacemos lo posible porque MediQ funcione siempre, pero no garantizamos que no tenga errores, interrupciones o pérdida de información.',
        'Podemos cambiar o quitar funciones. Si es algo importante, te lo diremos.',
      ],
    },
    {
      titulo: 'Eliminar tu cuenta',
      parrafos: ['Puedes eliminar tu cuenta y todos tus datos cuando quieras, desde Perfil. Es definitivo: no se puede deshacer.'],
    },
    {
      titulo: 'Límite de responsabilidad',
      parrafos: [
        'MediQ se ofrece tal como está. En la medida que la ley lo permita, el responsable no responde por decisiones médicas tomadas con base en la información de la app, ni por daños causados por errores, interrupciones, avisos que fallaron o pérdida de datos.',
        'Esto no limita los derechos que la ley te da como consumidor.',
      ],
    },
    {
      titulo: 'Cambios a estos términos',
      parrafos: ['Si estos términos cambian, publicaremos una versión nueva con su fecha y la app te pedirá aceptarla otra vez antes de seguir.'],
    },
    {
      titulo: 'Ley aplicable y tribunales',
      parrafos: ['Estos términos se rigen por las leyes de México. Para cualquier controversia, se someten a los tribunales competentes de Cancún, Quintana Roo, sin perjuicio de los derechos que la ley te otorga como consumidor.'],
    },
    {
      titulo: 'Contacto',
      parrafos: [`Para dudas o solicitudes sobre MediQ, escribe a ${RESPONSABLE.correo}.`],
    },
  ],
};

export const DOCUMENTOS_LEGALES: Record<Documento, DocumentoLegal> = { aviso_privacidad: AVISO, terminos: TERMINOS };
export const LISTA_DE_DOCUMENTOS_LEGALES: DocumentoLegal[] = DOCUMENTOS.map((d) => DOCUMENTOS_LEGALES[d]);
