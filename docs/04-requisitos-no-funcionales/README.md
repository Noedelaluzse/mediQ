# 4. Requisitos no funcionales

La prioridad es seguridad y privacidad: son datos de salud. Los umbrales numéricos son metas propuestas, ajustables.

- [RNF-01](RNF-01-seguridad.md) — Seguridad: Todo el tráfico por TLS 1.2 o superior
- [RNF-02](RNF-02-seguridad.md) — Seguridad: Tokens guardados en el almacén seguro del dispositivo (Keychain / Keystore), nunca en AsyncStorage
- [RNF-03](RNF-03-seguridad.md) — Seguridad: Fotos en bucket privado; acceso solo por URL firmada con vigencia de 5 minutos
- [RNF-04](RNF-04-seguridad.md) — Seguridad: Cada consulta SQL filtra por `user_id` del token; ningún endpoint acepta el `user_id` del cliente
- [RNF-05](RNF-05-seguridad.md) — Seguridad: Cifrado en reposo en base de datos y bucket
- [RNF-06](RNF-06-privacidad.md) — Privacidad: Ningún dato clínico en logs, analítica ni reportes de errores
- [RNF-07](RNF-07-privacidad.md) — Privacidad: Eliminar cuenta borra datos y fotos en un máximo de 30 días, respaldos incluidos
- [RNF-08](RNF-08-rendimiento.md) — Rendimiento: El diario abre en menos de 1.5 s con 200 consultas; paginación por cursor de 20
- [RNF-09](RNF-09-rendimiento.md) — Rendimiento: Foto comprimida a 1.5 MB o menos antes de subir
- [RNF-10](RNF-10-disponibilidad.md) — Disponibilidad: API con 99.5 % mensual; respaldo diario con recuperación a un punto en el tiempo
- [RNF-11](RNF-11-sin-conexion.md) — Sin conexión: El diario ya cargado se lee sin red; una consulta capturada sin red se guarda como borrador y se envía al reconectar
- [RNF-12](RNF-12-mantenibilidad.md) — Mantenibilidad: Dominio y aplicación sin importar React, React Native ni librerías de red; verificado por lint en CI
- [RNF-13](RNF-13-mantenibilidad.md) — Mantenibilidad: TypeScript en modo `strict`; cobertura de 80 % en dominio y aplicación
- [RNF-14](RNF-14-portabilidad.md) — Portabilidad: API descrita en OpenAPI para que un cliente nativo la consuma sin cambios en backend
- [RNF-15](RNF-15-tematizacion.md) — Tematización: Cero colores escritos fuera de `shared/theme`; cambiar la paleta toca un archivo
- [RNF-16](RNF-16-accesibilidad.md) — Accesibilidad: Objetivos táctiles de 44 px, contraste 4.5:1, respeta el tamaño de fuente del sistema
- [RNF-17](RNF-17-localizacion.md) — Localización: Textos externalizados; idioma inicial es-MX
- [RNF-18](RNF-18-compatibilidad.md) — Compatibilidad: Android 8 o superior, iOS 15 o superior
