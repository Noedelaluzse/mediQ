import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';
import { SelectField } from '@/shared/ui/SelectField';
import { TextField } from '@/shared/ui/TextField';

import {
  alternarFrase,
  CANTIDADES_DE_DOSIS,
  dosisTexto,
  DURACIONES_ESPECIALES,
  DURACIONES_RAPIDAS,
  duracionTexto,
  FRECUENCIA_POR_DEFECTO,
  FRECUENCIAS_CADA,
  FRECUENCIAS_OTRAS,
  FRECUENCIAS_VECES,
  frecuenciaCada,
  frecuenciaVeces,
  INDICACIONES_RAPIDAS,
  limiteDeDuracion,
  OTRA,
  UNIDADES_DE_DOSIS,
  UNIDADES_DE_DURACION,
  VIA_POR_DEFECTO,
  VIAS,
  type UnidadDeDuracion,
} from '../domain/CatalogoDeReceta';

/**
 * PROTOTIPO TEMPORAL (solo desarrollo): la receta con listas y atajos en vez de texto libre. No guarda nada y no usa casos de uso.
 * Si el diseño gusta, se lleva a `RecetaScreen`; si no, se borra esta pantalla y su acceso en Perfil.
 */
const USADOS = [
  { nombre: 'Aspirina', cantidad: '1', unidad: 'tableta', via: 'Oral', frecuencia: frecuenciaVeces(1) },
  { nombre: 'Metformina', cantidad: '1', unidad: 'tableta', via: 'Oral', frecuencia: frecuenciaVeces(2) },
];

const OPCIONES_DE_VIA = [...VIAS.map((v) => ({ valor: v.valor, etiqueta: v.ayuda ? `${v.etiqueta} · ${v.ayuda}` : v.etiqueta })), { valor: OTRA, etiqueta: OTRA }];
const opcionesDeUnidad = (cantidad: string) => UNIDADES_DE_DOSIS.map((u) => ({ valor: u.valor, etiqueta: cantidad === '1' || cantidad === '½' ? u.singular : u.plural }));

export function RecetaPruebaScreen() {
  const { color, fuente, radio } = useTema();

  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState('tableta');
  const [via, setVia] = useState(VIA_POR_DEFECTO);
  const [viaOtra, setViaOtra] = useState('');
  const [frecuencia, setFrecuencia] = useState(FRECUENCIA_POR_DEFECTO);
  const [frecuenciaOtra, setFrecuenciaOtra] = useState('');
  const [hojaDeFrecuencia, setHojaDeFrecuencia] = useState(false);
  const [duracionN, setDuracionN] = useState(7);
  const [duracionU, setDuracionU] = useState<UnidadDeDuracion>('dias');
  const [duracionEspecial, setDuracionEspecial] = useState<string | null>(null);
  const [duracionOtra, setDuracionOtra] = useState('');
  const [indicaciones, setIndicaciones] = useState('');

  const textoDeDuracion = duracionEspecial === OTRA ? duracionOtra.trim() || '(escribe la duración)' : (duracionEspecial ?? duracionTexto(duracionN, duracionU));
  const guardado = useMemo(
    () => [
      ['Nombre', nombre.trim() || '(escribe el nombre)'],
      ['Dosis', dosisTexto(cantidad, unidad)],
      ['Vía', via === OTRA ? viaOtra.trim() || '(escribe la vía)' : via],
      ['Frecuencia', frecuencia === OTRA ? frecuenciaOtra.trim() || '(escribe la frecuencia)' : frecuencia],
      ['Duración', textoDeDuracion],
      ['Indicaciones', indicaciones.trim() || '—'],
    ],
    [nombre, cantidad, unidad, via, viaOtra, frecuencia, frecuenciaOtra, textoDeDuracion, indicaciones],
  );

  const etiqueta = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 } as const;
  const tarjeta = { backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1 } as const;

  const Chip = ({ texto, activo, alPulsar, suave = false }: { texto: string; activo?: boolean; alPulsar: () => void; suave?: boolean }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(activo) }}
      onPress={alPulsar}
      style={{
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radio.pill,
        borderWidth: 1,
        justifyContent: 'center',
        backgroundColor: activo ? color.primario : suave ? color.primarioSuave : color.superficie,
        borderColor: activo ? color.primario : suave ? color.primarioSuave : color.bordeCampo,
      }}>
      <Text style={{ color: activo ? color.sobrePrimario : suave ? color.primario : color.texto, fontFamily: suave ? fuente.cuerpoBold : fuente.cuerpoSemi, fontSize: 14 }}>{texto}</Text>
    </Pressable>
  );

  const usar = (u: (typeof USADOS)[number]) => {
    setNombre(u.nombre);
    setCantidad(u.cantidad);
    setUnidad(u.unidad);
    setVia(u.via);
    setFrecuencia(u.frecuencia);
  };

  const elegirDuracion = (n: number, u: UnidadDeDuracion) => {
    setDuracionEspecial(null);
    setDuracionN(n);
    setDuracionU(u);
  };

  const cambiarUnidad = (u: UnidadDeDuracion) => {
    setDuracionEspecial(null);
    setDuracionU(u);
    setDuracionN((n) => Math.min(n, limiteDeDuracion(u)));
  };

  const mover = (delta: number) => {
    setDuracionEspecial(null);
    setDuracionN((n) => Math.max(1, Math.min(limiteDeDuracion(duracionU), n + delta)));
  };

  const frecuenciaElegida = (t: string) => {
    setFrecuencia(t);
    setHojaDeFrecuencia(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 18 }}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Volver</Text>
          </Pressable>

          <View style={{ backgroundColor: color.acentoRecetaSuave, borderColor: color.acentoReceta, borderWidth: 1, borderRadius: radio.md, padding: 12 }}>
            <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>Prototipo temporal: así podría ser la receta. No guarda nada.</Text>
          </View>

          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            Receta
          </Text>

          <View style={{ ...tarjeta, borderRadius: radio.lg, padding: 16, gap: 18 }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Medicamento 1</Text>

            <View style={{ gap: 8 }}>
              <TextField label="Nombre (obligatorio)" placeholder="Ej. Losartán" value={nombre} onChangeText={setNombre} autoCapitalize="sentences" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>Usados antes:</Text>
                {USADOS.map((u) => (
                  <Chip key={u.nombre} texto={u.nombre} suave alPulsar={() => usar(u)} />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={etiqueta}>Dosis: cuánto se toma cada vez</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CANTIDADES_DE_DOSIS.map((c) => (
                  <Chip key={c} texto={c} activo={cantidad === c} alPulsar={() => setCantidad(c)} />
                ))}
              </View>
              <SelectField label="Se toma en…" valor={unidad} opciones={opcionesDeUnidad(cantidad)} onChange={setUnidad} />
            </View>

            <View style={{ gap: 8 }}>
              <SelectField label="Vía" valor={via} opciones={OPCIONES_DE_VIA} onChange={setVia} />
              {via === OTRA ? <TextField label="¿Cuál vía?" placeholder="Ej. Intraarticular" value={viaOtra} onChangeText={setViaOtra} /> : null}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={etiqueta}>Frecuencia</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Frecuencia: ${frecuencia}`}
                onPress={() => setHojaDeFrecuencia(true)}
                style={{ height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}>{frecuencia}</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6 9l6 6 6-6" />
                </Svg>
              </Pressable>
              {frecuencia === OTRA ? <TextField label="¿Con qué frecuencia?" placeholder="Ej. Una vez por semana" value={frecuenciaOtra} onChangeText={setFrecuenciaOtra} /> : null}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={etiqueta}>Duración</Text>
              <View style={{ gap: 10, opacity: duracionEspecial ? 0.4 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Menos" onPress={() => mover(-1)} style={{ width: 44, height: 44, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 22 }}>−</Text>
                  </Pressable>
                  <Text accessibilityLabel={`${duracionN}`} style={{ minWidth: 52, textAlign: 'center', color: color.texto, fontFamily: fuente.titulo, fontSize: 26 }}>
                    {duracionN}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Más" onPress={() => mover(1)} style={{ width: 44, height: 44, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 22 }}>+</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {UNIDADES_DE_DURACION.map((u) => (
                    <Chip key={u.valor} texto={u.etiqueta} activo={duracionU === u.valor} alPulsar={() => cambiarUnidad(u.valor)} />
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DURACIONES_RAPIDAS.map((d) => (
                  <Chip key={`${d.cantidad}${d.unidad}`} texto={duracionTexto(d.cantidad, d.unidad)} activo={!duracionEspecial && duracionN === d.cantidad && duracionU === d.unidad} alPulsar={() => elegirDuracion(d.cantidad, d.unidad)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[...DURACIONES_ESPECIALES, OTRA].map((t) => (
                  <Chip key={t} texto={t} activo={duracionEspecial === t} alPulsar={() => setDuracionEspecial((a) => (a === t ? null : t))} />
                ))}
              </View>
              {duracionEspecial === OTRA ? <TextField label="¿Cuánto tiempo?" placeholder="Ej. Hasta la próxima cita" value={duracionOtra} onChangeText={setDuracionOtra} /> : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={etiqueta}>Indicaciones</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {INDICACIONES_RAPIDAS.map((t) => (
                  <Chip key={t} texto={t} activo={indicaciones.split(/\.\s+|\.$/).map((f) => f.trim()).includes(t)} alPulsar={() => setIndicaciones((a) => alternarFrase(a, t))} />
                ))}
              </View>
              <TextInput
                accessibilityLabel="Indicaciones"
                placeholder="Escribe solo si falta algo"
                placeholderTextColor={color.textoSecundario}
                value={indicaciones}
                onChangeText={setIndicaciones}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 72, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, padding: 12, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}
              />
            </View>
          </View>

          <View style={{ ...tarjeta, borderRadius: radio.lg, padding: 16, gap: 8 }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Así se guardaría</Text>
            {guardado.map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ width: 100, color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{k}</Text>
                <Text style={{ flex: 1, color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 13 }}>{v}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={hojaDeFrecuencia} transparent animationType="fade" onRequestClose={() => setHojaDeFrecuencia(false)}>
        <Pressable accessibilityLabel="Cerrar" onPress={() => setHojaDeFrecuencia(false)} style={{ flex: 1, backgroundColor: color.velo, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: color.superficie, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 28, maxHeight: '80%' }}>
            <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 20, paddingHorizontal: 20, paddingBottom: 8 }}>Frecuencia</Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              <Text style={{ ...etiqueta, textTransform: 'uppercase', letterSpacing: 0.6 }}>Cada…</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {FRECUENCIAS_CADA.map((h) => (
                  <Chip key={h} texto={`${h} h`} activo={frecuencia === frecuenciaCada(h)} alPulsar={() => frecuenciaElegida(frecuenciaCada(h))} />
                ))}
              </View>
              <Text style={{ ...etiqueta, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 }}>Veces al día</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {FRECUENCIAS_VECES.map((n) => (
                  <Chip key={n} texto={`${n}`} activo={frecuencia === frecuenciaVeces(n)} alPulsar={() => frecuenciaElegida(frecuenciaVeces(n))} />
                ))}
              </View>
              <Text style={{ ...etiqueta, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 }}>Otros</Text>
              {[...FRECUENCIAS_OTRAS, OTRA].map((t) => (
                <Pressable key={t} accessibilityRole="radio" accessibilityState={{ selected: frecuencia === t }} onPress={() => frecuenciaElegida(t)} style={{ minHeight: 48, justifyContent: 'center' }}>
                  <Text style={{ color: frecuencia === t ? color.primario : color.texto, fontFamily: frecuencia === t ? fuente.cuerpoBold : fuente.cuerpoMedio, fontSize: 16 }}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
