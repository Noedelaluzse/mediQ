/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ESCRITURAS, NO_ESCRIBEN } from './clasificacionDeCasosDeUso';

/**
 * P-06 (F058): las pantallas ya no recargan siempre al volver; recargan si algo cambió. Lo que «cambió» lo avisan los casos de uso de
 * escritura. Esta prueba obliga a clasificar cada caso de uso nuevo del contenedor: si uno que escribe se olvida, la pantalla
 * mostraría datos viejos hasta pasar el minuto de vigencia.
 */
const fuente = readFileSync(resolve(__dirname, 'container.ts'), 'utf8');
const inicio = fuente.indexOf('\n  const casos = {\n');
const bloque = fuente.slice(inicio + 1, fuente.indexOf('\n  };\n', inicio));
const llaves = [...bloque.matchAll(/^ {4}([A-Za-z]+)[:,]/gm)].map((m) => m[1]);

describe('clasificación de los casos de uso del contenedor', () => {
  it('se leyeron los casos de uso del contenedor', () => {
    expect(llaves.length).toBeGreaterThan(40);
    expect(llaves).toContain('registrarConsulta');
  });

  it('todos están clasificados: o escriben o no escriben', () => {
    const sinClasificar = llaves.filter((k) => !ESCRITURAS.includes(k) && !NO_ESCRIBEN.includes(k));
    expect(sinClasificar).toEqual([]);
  });

  it('ninguno está en las dos listas, ni hay nombres que ya no existen', () => {
    expect(ESCRITURAS.filter((k) => NO_ESCRIBEN.includes(k))).toEqual([]);
    expect([...ESCRITURAS, ...NO_ESCRIBEN].filter((k) => !llaves.includes(k))).toEqual([]);
  });

  it('las escrituras que guardan datos de la cuenta están marcadas', () => {
    for (const k of ['registrarConsulta', 'guardarConsultaNueva', 'editarConsulta', 'eliminarConsulta', 'guardarReceta', 'guardarMedico', 'eliminarMedico', 'agregarLugar', 'renombrarLugar', 'eliminarLugar', 'guardarDatosDeSalud', 'registrarToma', 'deshacerToma', 'adjuntarFotoDeReceta', 'quitarFotoDeReceta', 'enviarConsultasPendientes']) {
      expect(ESCRITURAS).toContain(k);
    }
  });

  it('el contenedor envuelve las escrituras con conInvalidaciones', () => {
    expect(fuente).toContain('return conInvalidaciones(casos, ESCRITURAS)');
  });

  // AUD-03 / F064: sin esto, la receta y sus recordatorios volverían a guardarse en dos pasos y podrían quedar de versiones distintas.
  it('el contenedor guarda la receta con el guardado atómico (receta + marca + recordatorios en una operación)', () => {
    expect(fuente).toContain('new FirestoreGuardadoDeReceta(');
    expect(fuente).toMatch(/guardarReceta: new GuardarReceta\(.*guardadoDeReceta\)/);
  });

  // AUD-07 / F065 (decisión del usuario): lo que vive solo en este teléfono no debe quedar tras cerrar sesión.
  it('cerrar sesión borra también el borrador de «Nueva consulta»', () => {
    const limpieza = fuente.match(/new SesionQueCancelaAvisos\([^\n]*/)?.[0] ?? '';
    expect(limpieza).toContain('borradores.borrar()');
    for (const dato of ['copiaLocal.limpiar()', 'colaDeEnvio.vaciar()', 'preferenciaDelCandado.limpiar()', 'cacheDeFotos.limpiar()']) expect(limpieza).toContain(dato);
  });

  // AUD-10 / F070: la tarjeta «Hoy» y los avisos comparten lecturas; una copia compartida NO debe verla otra cuenta tras cerrar sesión.
  it('el contenedor comparte las lecturas de citas, recordatorios y dosis marcadas', () => {
    for (const envoltorio of ['new ProximaCitaCompartida(', 'new RecordatoriosCompartidos(', 'new RegistroDeTomasCompartido(', 'new CargarTodoElDiarioConCopia(']) expect(fuente).toContain(envoltorio);
  });

  it('cerrar sesión descarta lo compartido (sube la versión de los datos), para que otra cuenta nunca vea la copia de la anterior', () => {
    const limpieza = fuente.match(/new SesionQueCancelaAvisos\([^\n]*/)?.[0] ?? '';
    expect(limpieza).toContain('marcarDatosCambiados()');
  });
});

