import { describe, expect, it } from 'vitest';

import { FotoInvalidaError } from '../domain/errors';
import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';
import type { OrigenDeFoto, ResultadoDeSeleccion, SelectorDeFoto } from '../domain/SelectorDeFoto';
import { AdjuntarFotoDeReceta } from './AdjuntarFotoDeReceta';
import { ObtenerFotoDeReceta } from './ObtenerFotoDeReceta';
import { QuitarFotoDeReceta } from './QuitarFotoDeReceta';

class Repo implements FotoDeRecetaRepository {
  guardadas = new Map<string, { foto: FotoDeReceta; base64: string }>();
  async obtener(consultaId: string) {
    const g = this.guardadas.get(consultaId);
    return g ? { foto: g.foto, uri: `data:${g.foto.tipoMime};base64,${g.base64}` } : null;
  }
  async guardar(consultaId: string, foto: FotoDeReceta, base64: string) {
    this.guardadas.set(consultaId, { foto, base64 });
  }
  async quitar(consultaId: string) {
    this.guardadas.delete(consultaId);
  }
}

class Selector implements SelectorDeFoto {
  pedidos: OrigenDeFoto[] = [];
  constructor(private readonly respuesta: ResultadoDeSeleccion) {}
  async elegir(origen: OrigenDeFoto) {
    this.pedidos.push(origen);
    return this.respuesta;
  }
}

const elegida = (extra: Partial<{ tipoMime: string; bytes: number }> = {}): ResultadoDeSeleccion => ({
  estado: 'elegida',
  foto: { base64: 'AAAA', tipoMime: 'image/jpeg', bytes: 3, ancho: 800, alto: 600, ...extra },
});

describe('AdjuntarFotoDeReceta', () => {
  it.each(['camara', 'galeria'] as const)('con %s: pide la foto al selector y la guarda en la consulta', async (origen) => {
    const repo = new Repo();
    const selector = new Selector(elegida());
    const r = await new AdjuntarFotoDeReceta(selector, repo).ejecutar('c1', origen);
    expect(selector.pedidos).toEqual([origen]);
    expect(r.ok && r.value).toMatchObject({ estado: 'adjuntada', foto: { tipoMime: 'image/jpeg', bytes: 3, ancho: 800, alto: 600 } });
    expect(repo.guardadas.get('c1')?.base64).toBe('AAAA');
  });

  it('si se cancela no guarda nada', async () => {
    const repo = new Repo();
    const r = await new AdjuntarFotoDeReceta(new Selector({ estado: 'cancelada' }), repo).ejecutar('c1', 'galeria');
    expect(r.ok && r.value.estado).toBe('cancelada');
    expect(repo.guardadas.size).toBe(0);
  });

  it('si no hay permiso lo informa, con si se puede volver a preguntar, y no guarda', async () => {
    const repo = new Repo();
    const r = await new AdjuntarFotoDeReceta(new Selector({ estado: 'permiso-denegado', puedePreguntar: false }), repo).ejecutar('c1', 'camara');
    expect(r.ok && r.value).toEqual({ estado: 'permiso-denegado', puedePreguntar: false });
    expect(repo.guardadas.size).toBe(0);
  });

  it('una foto inválida (tipo o tamaño) no se guarda', async () => {
    const repo = new Repo();
    const uc = new AdjuntarFotoDeReceta(new Selector(elegida({ tipoMime: 'application/pdf' })), repo);
    const r = await uc.ejecutar('c1', 'galeria');
    expect(!r.ok && r.error).toBeInstanceOf(FotoInvalidaError);
    expect(repo.guardadas.size).toBe(0);
    const grande = await new AdjuntarFotoDeReceta(new Selector(elegida({ bytes: 6_000_000 })), repo).ejecutar('c1', 'galeria');
    expect(grande.ok).toBe(false);
  });

  it('adjuntar otra foto reemplaza la anterior (solo una por receta)', async () => {
    const repo = new Repo();
    await new AdjuntarFotoDeReceta(new Selector(elegida()), repo).ejecutar('c1', 'galeria');
    await new AdjuntarFotoDeReceta(new Selector({ estado: 'elegida', foto: { base64: 'BBBB', tipoMime: 'image/jpeg', bytes: 3, ancho: 1, alto: 1 } }), repo).ejecutar('c1', 'camara');
    expect(repo.guardadas.size).toBe(1);
    expect(repo.guardadas.get('c1')?.base64).toBe('BBBB');
  });
});

describe('ObtenerFotoDeReceta y QuitarFotoDeReceta', () => {
  it('devuelve la foto con su uri y null si no hay', async () => {
    const repo = new Repo();
    await repo.guardar('c1', { tipoMime: 'image/jpeg', bytes: 3 }, 'AAAA');
    const r = await new ObtenerFotoDeReceta(repo).ejecutar('c1');
    expect(r?.uri).toBe('data:image/jpeg;base64,AAAA');
    expect(await new ObtenerFotoDeReceta(repo).ejecutar('otra')).toBeNull();
  });

  it('quitar la borra y no falla si no había', async () => {
    const repo = new Repo();
    await repo.guardar('c1', { tipoMime: 'image/jpeg', bytes: 3 }, 'AAAA');
    const uc = new QuitarFotoDeReceta(repo);
    await uc.ejecutar('c1');
    await uc.ejecutar('c1');
    expect(repo.guardadas.size).toBe(0);
  });
});
