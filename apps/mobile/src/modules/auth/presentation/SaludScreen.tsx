import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useEdicion } from '@/app/useEdicion';
import { useTema } from '@/shared/theme';
import { AvisoSinConexion } from '@/shared/ui/AvisoSinConexion';
import { ChipDeOpcion } from '@/shared/ui/ChipDeOpcion';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { FormularioCargando } from '@/shared/ui/FormularioCargando';

import { edadEn, ETIQUETA_DE_SEXO, etiquetaDeSangre, MAX_LARGO_ALERGIA, SEXOS, TIPOS_DE_SANGRE, type DatosDeSalud } from '../domain/DatosDeSalud';
import { agregarEnLista, alternarSinAlergias, aDatos, desdeDatos, fechaAIso, nacimientoPorDefecto, quitarDeLista, type FormularioDeSalud, type ListaDeAlergias } from './formularioDeSalud';
import { anunciarSaludCompleta, publicarSalud, seCompletoAlGuardar } from './saludPendiente';

const AÑOS_POR_DEFECTO = 30;

/** Lista de alergias como etiquetas que se agregan y se quitan, más «no tengo alergias conocidas». */
function ListaDeAlergiasCampo({
  titulo,
  items,
  sinConocidas,
  textoSin,
  placeholder,
  alAgregar,
  alQuitar,
  alAlternarSin,
}: {
  titulo: string;
  items: string[];
  sinConocidas: boolean;
  textoSin: string;
  placeholder: string;
  alAgregar: (texto: string) => string | undefined;
  alQuitar: (item: string) => void;
  alAlternarSin: () => void;
}) {
  const { color, fuente, radio } = useTema();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | undefined>();

  function agregar() {
    if (texto.trim().length === 0) return;
    const fallo = alAgregar(texto);
    setError(fallo);
    if (!fallo) setTexto('');
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          accessibilityLabel={titulo}
          placeholder={placeholder}
          placeholderTextColor={color.textoSecundario}
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setError(undefined);
          }}
          onSubmitEditing={agregar}
          returnKeyType="done"
          maxLength={MAX_LARGO_ALERGIA}
          autoCapitalize="sentences"
          style={{ flex: 1, height: 48, color: color.texto, backgroundColor: color.superficie, borderColor: error ? color.peligro : color.bordeCampo, borderWidth: error ? 2 : 1, borderRadius: radio.md, paddingHorizontal: 12, fontFamily: fuente.cuerpo, fontSize: 15 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Agregar a ${titulo.toLowerCase()}`}
          onPress={agregar}
          style={{ height: 48, paddingHorizontal: 16, borderRadius: radio.md, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Agregar</Text>
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
      {items.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${i}`}
              onPress={() => alQuitar(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingLeft: 12, paddingRight: 10, borderRadius: radio.pill, backgroundColor: color.peligroSuave }}>
              <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{i}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color.peligro} strokeWidth={2.4} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: sinConocidas }}
        onPress={alAlternarSin}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: sinConocidas ? color.primario : color.bordeCampo, backgroundColor: sinConocidas ? color.primario : color.superficie, alignItems: 'center', justifyContent: 'center' }}>
          {sinConocidas ? (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12l5 5 9-10" />
            </Svg>
          ) : null}
        </View>
        <Text style={{ flex: 1, color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 14 }}>{textoSin}</Text>
      </Pressable>
    </View>
  );
}

/** Formulario de «Mi salud» (RF-02): todo es opcional y se llena con el tiempo. Solo lo ve su dueño. */
export function SaludScreen() {
  const { color, fuente, radio } = useTema();
  const obtenerDatos = useCasoDeUso('obtenerDatosDeSalud');
  const guardarDatos = useCasoDeUso('guardarDatosDeSalud');
  const { puedeEditar, motivo: motivoSinInternet } = useEdicion();

  const [formulario, setFormulario] = useState<FormularioDeSalud | null>(null);
  // Lo guardado al abrir: sirve para saber si este guardado es el que completa los datos.
  const [inicial, setInicial] = useState<DatosDeSalud | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [intento, setIntento] = useState(0);
  const [falloAlCargar, setFalloAlCargar] = useState(false);

  useEffect(() => {
    obtenerDatos.ejecutar().then(
      (d) => {
        setFormulario(desdeDatos(d));
        setInicial(d);
        publicarSalud(d);
      },
      () => setFalloAlCargar(true),
    );
  }, [obtenerDatos, intento]);

  if (falloAlCargar) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo, padding: 20, gap: 16, justifyContent: 'center' }}>
        <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16, textAlign: 'center' }}>No pudimos cargar tus datos de salud. Revisa tu conexión.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFalloAlCargar(false);
            setIntento((n) => n + 1);
          }}
          style={{ height: 48, borderRadius: 24, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (formulario === null) return <FormularioCargando titulo="Mi salud" campos={5} etiqueta="Cargando tus datos de salud" />;

  const hoy = new Date();
  const edad = formulario.nacimiento ? edadEn(fechaAIso(formulario.nacimiento), hoy) : null;
  const cambiar = (cambios: Partial<FormularioDeSalud>) => setFormulario({ ...formulario, ...cambios });
  const etiqueta = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 } as const;

  async function guardar() {
    if (formulario === null) return;
    setOcupado(true);
    try {
      const r = await guardarDatos.ejecutar(aDatos(formulario));
      if (r.ok) {
        publicarSalud(r.value);
        if (inicial && seCompletoAlGuardar(inicial, r.value)) anunciarSaludCompleta();
        return router.back();
      }
      Alert.alert('Revisa tus datos', r.error.message);
    } catch {
      Alert.alert('No pudimos guardar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 20 }}>
          <AvisoSinConexion motivo={motivoSinInternet} />
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
          </Pressable>

          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            Mi salud
          </Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
            Solo tú ves esto. Llénalo con calma; puedes dejar lo que no sepas y completarlo después.
          </Text>

          <View style={{ gap: 6 }}>
            {formulario.nacimiento ? (
              <>
                <DateTimeField label="Fecha de nacimiento" mode="date" value={formulario.nacimiento} maximumDate={hoy} onChange={(f) => cambiar({ nacimiento: f })} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>
                    Edad: <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi }}>{edad === null ? '—' : `${edad} ${edad === 1 ? 'año' : 'años'}`}</Text> (se calcula sola)
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => cambiar({ nacimiento: null })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>Quitar</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={etiqueta}>Fecha de nacimiento</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => cambiar({ nacimiento: nacimientoPorDefecto(hoy, AÑOS_POR_DEFECTO) })}
                  style={{ height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, paddingHorizontal: 12, justifyContent: 'center' }}>
                  <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>Elegir fecha</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={etiqueta}>Sexo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SEXOS.map((s) => (
                <ChipDeOpcion key={s} texto={ETIQUETA_DE_SEXO[s]} activo={formulario.sexo === s} alPulsar={() => cambiar({ sexo: formulario.sexo === s ? null : s })} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={etiqueta}>Tipo de sangre</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIPOS_DE_SANGRE.map((t) => (
                <ChipDeOpcion key={t} texto={etiquetaDeSangre(t)} activo={formulario.tipoDeSangre === t} alPulsar={() => cambiar({ tipoDeSangre: formulario.tipoDeSangre === t ? null : t })} />
              ))}
            </View>
          </View>

          {(
            [
              { lista: 'alergias', titulo: 'Alergias', items: formulario.alergias, sin: formulario.sinAlergias, textoSin: 'No tengo alergias conocidas', placeholder: 'Polen, mariscos…' },
              { lista: 'medicamentos', titulo: 'Alergias a medicamentos', items: formulario.medicamentos, sin: formulario.sinMedicamentos, textoSin: 'No tengo alergias a medicamentos conocidas', placeholder: 'Penicilina, ibuprofeno…' },
            ] as { lista: ListaDeAlergias; titulo: string; items: string[]; sin: boolean; textoSin: string; placeholder: string }[]
          ).map((c) => (
            <ListaDeAlergiasCampo
              key={c.lista}
              titulo={c.titulo}
              items={c.items}
              sinConocidas={c.sin}
              textoSin={c.textoSin}
              placeholder={c.placeholder}
              alAgregar={(texto) => {
                const r = agregarEnLista(formulario, c.lista, texto);
                setFormulario(r.formulario);
                return r.error;
              }}
              alQuitar={(item) => setFormulario(quitarDeLista(formulario, c.lista, item))}
              alAlternarSin={() => setFormulario(alternarSinAlergias(formulario, c.lista))}
            />
          ))}

          <View style={{ marginTop: 'auto' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: ocupado, disabled: ocupado || !puedeEditar }}
              disabled={ocupado || !puedeEditar}
              onPress={guardar}
              style={{ height: 54, borderRadius: 27, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center', opacity: ocupado || !puedeEditar ? 0.45 : 1 }}>
              <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>{ocupado ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

