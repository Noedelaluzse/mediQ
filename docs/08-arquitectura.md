# 8. Arquitectura: Clean Architecture + DDD + inversión de dependencias

Cuatro capas por módulo, con una regla: el código de una capa solo importa de capas más internas. El dominio define interfaces (puertos) y la infraestructura las implementa; eso es la inversión de dependencias.

&#91;embedded content: capas de la app · 4 capas y el composition root\]

La infraestructura depende del dominio y no al revés; el composition root es el único lugar que conoce las clases concretas.

## Contextos y agregados (DDD)

| Contexto | Agregado raíz | Contiene | Reglas principales |
| --- | --- | --- | --- |
| Identidad | Usuario | Sesión, Consentimiento | Un usuario por cuenta de Google; sin consentimiento no se guardan datos |
| Diario | Consulta | Indicación | La fecha no puede ser futura; la próxima cita es posterior a la consulta |
| Recetas | Receta | Medicamento, Foto | Pertenece a una consulta; cada medicamento exige nombre |
| Directorio | Médico | — | Nombre obligatorio; es del usuario, no un catálogo público. El lugar de atención es otra entidad de este contexto: nombre libre, único por usuario |

Value objects: `ConsultaId`, `Especialidad`, `TipoDeMedico`, `Telefono`, `Dosis`, `FechaDeConsulta`. Los agregados se referencian entre sí por id, nunca por objeto.

## Estructura de carpetas

```text
mediq/
├─ apps/
│  └─ mobile/                      # Expo + React Native
│     ├─ plugins/                  # config plugins locales (p. ej. UIScene para iOS 27)
│     └─ src/
│        ├─ modules/
│        │  ├─ auth/
│        │  ├─ consultas/
│        │  │  ├─ domain/          # Consulta, value objects, ConsultaRepository (puerto)
│        │  │  ├─ application/     # RegistrarConsulta, ListarDiario
│        │  │  ├─ infrastructure/  # ConsultaFirestoreRepository, mappers, borradores SQLite
│        │  │  └─ presentation/    # pantallas, componentes, hooks
│        │  ├─ recetas/
│        │  └─ medicos/
│        ├─ shared/
│        │  ├─ kernel/             # Result, DomainError, Id
│        │  ├─ theme/              # paletas, tokens, ThemeProvider
│        │  └─ ui/                 # Button, Card, Chip, TextField
│        └─ app/
│           ├─ container.ts        # composition root
│           └─ routes/             # Expo Router
└─ firebase/                       # reglas de Firestore y de Storage, índices (se prueban con el emulador)
```

## Ejemplo: del puerto al composition root

```ts
// modules/consultas/domain/ConsultaRepository.ts  (puerto)
export interface ConsultaRepository {
  guardar(consulta: Consulta): Promise<void>;
  listar(cursor?: string): Promise<Pagina<Consulta>>;
  porId(id: ConsultaId): Promise<Consulta | null>;
}

// modules/consultas/domain/Consulta.ts  (agregado)
export class Consulta {
  private constructor(private readonly props: ConsultaProps) {}

  static registrar(input: NuevaConsulta, ahora: Date): Result<Consulta, DomainError> {
    if (input.fecha > ahora) return err(new FechaFuturaError());
    if (input.proximaCita && input.proximaCita <= input.fecha)
      return err(new ProximaCitaInvalidaError());
    return ok(new Consulta({ ...input, id: ConsultaId.nuevo() }));
  }
}

// modules/consultas/application/RegistrarConsulta.ts  (caso de uso)
export class RegistrarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly medicos: MedicoRepository,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(cmd: RegistrarConsultaCmd): Promise<Result<ConsultaId, DomainError>> {
    const consulta = Consulta.registrar(cmd, this.reloj.ahora());
    if (!consulta.ok) return consulta;
    if (cmd.medicoNuevo) await this.medicos.guardar(cmd.medicoNuevo);
    await this.consultas.guardar(consulta.value);
    return ok(consulta.value.id);
  }
}

// app/container.ts  (composition root: único lugar con clases concretas)
export function crearContainer(env: Env) {
  const { firestore } = obtenerFirebase(env.firebase);
  const consultas = new ConsultaFirestoreRepository(firestore);
  const medicos = new MedicoFirestoreRepository(firestore);
  return {
    registrarConsulta: new RegistrarConsulta(consultas, medicos, new RelojDelSistema()),
    listarDiario: new ListarDiario(consultas),
  };
}
export type Container = ReturnType<typeof crearContainer>;
```

La presentación recibe el contenedor por contexto de React (`useCasoDeUso('registrarConsulta')`) y nunca instancia repositorios. En pruebas se crea el contenedor con repositorios en memoria.

## Reglas que se verifican en CI

- `domain/` no importa nada fuera de `domain/` y `shared/kernel`.
- `application/` importa solo de `domain/`.
- `presentation/` importa de `application/` y `shared/`, nunca de `infrastructure/`.
- Solo `app/container.ts` importa de `infrastructure/`.
- Un módulo importa de otro solo por su `index.ts` público.

Se aplican con `eslint-plugin-boundaries`. No hay API propia: la infraestructura son los adaptadores de Firebase (Auth, Firestore y Storage), y las **reglas de seguridad** de `firebase/` son infraestructura declarativa fuera de estas capas. Como son la única barrera de autorización (RNF-04), cada cambio en ellas se prueba con el emulador.
