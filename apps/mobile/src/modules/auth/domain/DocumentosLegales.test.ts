import { describe, expect, it } from 'vitest';

import { DOCUMENTOS, VERSIONES_VIGENTES } from './Consentimiento';
import { DOCUMENTOS_LEGALES, etiquetaDeVersion, RESPONSABLE, textoCompleto, type DocumentoLegal } from './DocumentosLegales';

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const titulos = (d: DocumentoLegal) => d.secciones.map((s) => sinAcentos(s.titulo));
const aviso = DOCUMENTOS_LEGALES.aviso_privacidad;
const terminos = DOCUMENTOS_LEGALES.terminos;

describe('el responsable', () => {
  it('son los datos que dio el usuario: nombre, ciudad y correo de contacto', () => {
    expect(RESPONSABLE.nombre).toBe('Noe De la Luz');
    expect(RESPONSABLE.ubicacion).toContain('Cancún');
    expect(RESPONSABLE.ubicacion).toContain('Quintana Roo');
    expect(RESPONSABLE.correo).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it('aparece en el aviso y en los términos (quien lee sabe con quién hablar)', () => {
    for (const d of [aviso, terminos]) {
      const t = textoCompleto(d);
      expect(t, d.titulo).toContain(RESPONSABLE.correo);
    }
    expect(textoCompleto(aviso)).toContain(RESPONSABLE.nombre);
    expect(textoCompleto(aviso)).toContain('Cancún');
  });
});

describe('versión de cada documento', () => {
  it('hay un texto para cada documento que la app pide aceptar y su versión es la vigente (si no, la app pediría aceptar algo distinto de lo que se lee)', () => {
    expect(Object.keys(DOCUMENTOS_LEGALES).sort()).toEqual([...DOCUMENTOS].sort());
    for (const d of DOCUMENTOS) expect(DOCUMENTOS_LEGALES[d].version).toBe(VERSIONES_VIGENTES[d]);
  });

  it('la versión se muestra como fecha en palabras', () => {
    expect(etiquetaDeVersion('2026-10-06')).toBe('6 de octubre de 2026');
    expect(etiquetaDeVersion('2027-01-01')).toBe('1 de enero de 2027');
  });
});

describe('aviso de privacidad: lo que debe decir un aviso para datos de salud', () => {
  const debeTener: [string, string][] = [
    ['responsable', 'responsable'],
    ['datos que se guardan', 'datos'],
    ['finalidades', 'para que usamos'],
    ['con quién se comparten', 'se comparten'],
    ['dónde se guardan y seguridad', 'protegemos'],
    ['derechos ARCO', 'derechos'],
    ['revocar el consentimiento', 'revocar'],
    ['menores de edad', 'menores'],
    ['cambios al aviso', 'cambios'],
    ['consentimiento expreso', 'consentimiento'],
  ];
  it.each(debeTener)('tiene una sección sobre: %s', (_tema, clave) => {
    expect(titulos(aviso).some((t) => t.includes(clave)), clave).toBe(true);
  });

  it('nombra los datos de salud que de verdad guarda la app', () => {
    const t = sinAcentos(textoCompleto(aviso));
    for (const dato of ['consultas', 'recetas', 'foto', 'alergias', 'sangre', 'nacimiento', 'tomas', 'medico', 'sensibles']) expect(t, dato).toContain(dato);
  });

  it('dice que los datos de salud son sensibles y pide consentimiento expreso', () => {
    const t = sinAcentos(textoCompleto(aviso));
    expect(t).toContain('datos personales sensibles');
    expect(t).toContain('consentimiento expreso');
  });

  it('explica los cuatro derechos y cómo ejercerlos: en la app y por correo, con un plazo', () => {
    const t = sinAcentos(textoCompleto(aviso));
    for (const d of ['acceder', 'rectificar', 'cancelar', 'oponerte']) expect(t, d).toContain(d);
    expect(t).toContain('eliminar mi cuenta');
    expect(t).toMatch(/20 dias habiles/);
  });

  it('dice con quién se comparte: nadie para fines propios, y Google como proveedor de infraestructura', () => {
    const t = sinAcentos(textoCompleto(aviso));
    expect(t).toContain('no vendemos');
    expect(t).toContain('google');
    expect(t).toContain('fuera de mexico');
  });

  it('dice la verdad sobre la copia en el teléfono (para usar la app sin internet) y que se borra al cerrar sesión', () => {
    const t = sinAcentos(textoCompleto(aviso));
    expect(t).toContain('sin internet');
    expect(t).toContain('cerrar sesion');
  });
});

describe('términos y condiciones', () => {
  const debeTener: [string, string][] = [
    ['qué es MediQ', 'que es mediq'],
    ['no es atención médica', 'no es atencion medica'],
    ['la cuenta', 'tu cuenta'],
    ['la información que registra', 'informacion que registras'],
    ['avisos y recordatorios', 'recordatorios'],
    ['uso aceptable', 'uso aceptable'],
    ['disponibilidad', 'disponibilidad'],
    ['eliminar la cuenta', 'eliminar tu cuenta'],
    ['límite de responsabilidad', 'responsabilidad'],
    ['cambios', 'cambios'],
    ['ley aplicable', 'ley aplicable'],
    ['contacto', 'contacto'],
  ];
  it.each(debeTener)('tiene una sección sobre: %s', (_tema, clave) => {
    expect(titulos(terminos).some((t) => t.includes(clave)), clave).toBe(true);
  });

  it('avisa que MediQ no sustituye al médico y manda a emergencias al 911', () => {
    const t = sinAcentos(textoCompleto(terminos));
    expect(t).toContain('no sustituye');
    expect(t).toContain('911');
  });

  it('avisa que los recordatorios pueden fallar y que no hay que depender solo de ellos', () => {
    const t = sinAcentos(textoCompleto(terminos));
    expect(t).toContain('pueden fallar');
    expect(t).toMatch(/no dependas solo/);
  });

  it('la ley aplicable es la de México y los tribunales los de Cancún, sin quitar derechos de consumidor', () => {
    const t = sinAcentos(textoCompleto(terminos));
    expect(t).toContain('leyes de mexico');
    expect(t).toContain('cancun');
    expect(t).toContain('consumidor');
  });
});

describe('calidad de los textos', () => {
  it('todos tienen introducción y secciones con título y texto, sin marcas de «pendiente» olvidadas', () => {
    for (const d of Object.values(DOCUMENTOS_LEGALES)) {
      expect(d.introduccion.length, d.titulo).toBeGreaterThan(40);
      expect(d.secciones.length, d.titulo).toBeGreaterThanOrEqual(8);
      for (const s of d.secciones) {
        expect(s.titulo.trim().length, `${d.titulo}/titulo`).toBeGreaterThan(2);
        expect(s.parrafos.length, `${d.titulo}/${s.titulo}`).toBeGreaterThan(0);
        for (const p of s.parrafos) expect(p.trim().length, `${d.titulo}/${s.titulo}`).toBeGreaterThan(10);
      }
      // «TODO» y «XXX» se buscan en mayúsculas: «todo» y «todos» son palabras normales del texto.
      expect(textoCompleto(d)).not.toMatch(/\[|\]|\bTODO\b|\bXXX\b|lorem ipsum|pendiente de redactar/);
    }
  });

  it('los títulos de las secciones no se repiten dentro de un documento', () => {
    for (const d of Object.values(DOCUMENTOS_LEGALES)) expect(new Set(titulos(d)).size, d.titulo).toBe(d.secciones.length);
  });
});
