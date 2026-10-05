import { AgregarLugar } from '@/modules/medicos/application/AgregarLugar';
import { GuardarMedico } from '@/modules/medicos/application/GuardarMedico';
import { claveDeLugar } from '@/modules/medicos/domain/Lugar';
import type { LugaresRepository } from '@/modules/medicos/domain/LugaresRepository';
import type { MedicosRepository } from '@/modules/medicos/domain/MedicosRepository';
import { claveDeNombre } from '@/modules/medicos/domain/ordenarPorNombre';
import { err, ok } from '@/shared/kernel/Result';

import type { ContactoDeMedico } from '../domain/ContactoDeMedico';
import type { LugaresParaConsulta, MedicosParaConsulta } from '../domain/puertos';

/** Conecta la consulta con el directorio de médicos sin que el dominio de consultas conozca al de médicos. */
export class MedicosParaConsultaDeMedicos implements MedicosParaConsulta {
  private readonly guardar: GuardarMedico;

  constructor(
    private readonly medicos: MedicosRepository,
    generarId: () => string,
  ) {
    this.guardar = new GuardarMedico(medicos, generarId);
  }

  async asegurar(d: Parameters<MedicosParaConsulta['asegurar']>[0]) {
    if (d.medicoId) {
      const elegido = await this.medicos.obtener(d.medicoId);
      if (elegido) return ok({ id: elegido.id, nombre: elegido.nombreCompleto });
    }
    const clave = claveDeNombre(d.nombre);
    const mismoNombre = (await this.medicos.listar()).find((m) => claveDeNombre(m.nombreCompleto) === clave);
    if (mismoNombre) return ok({ id: mismoNombre.id, nombre: mismoNombre.nombreCompleto });

    const r = await this.guardar.ejecutar({ nombre: d.nombre, especialidad: d.especialidad, telefono: d.telefono, cedula: d.cedula });
    return r.ok ? ok({ id: r.value.id, nombre: r.value.nombreCompleto }) : err(r.error);
  }
}

export class LugaresParaConsultaDeMedicos implements LugaresParaConsulta {
  private readonly agregar: AgregarLugar;

  constructor(
    private readonly lugares: LugaresRepository,
    generarId: () => string,
  ) {
    this.agregar = new AgregarLugar(lugares, generarId);
  }

  async asegurar(nombre: string) {
    const existente = await this.lugares.buscarPorClave(claveDeLugar(nombre));
    if (existente) return ok({ id: existente.id, nombre: existente.nombre });
    const r = await this.agregar.ejecutar(nombre);
    return r.ok ? ok({ id: r.value.id, nombre: r.value.nombre }) : err(r.error);
  }
}

/** El teléfono de un médico sale del directorio (`doctors/{id}`). */
export class ContactoDeMedicoDelDirectorio implements ContactoDeMedico {
  constructor(private readonly medicos: MedicosRepository) {}

  async telefonoDe(medicoId: string): Promise<string | undefined> {
    return (await this.medicos.obtener(medicoId))?.telefono;
  }
}
