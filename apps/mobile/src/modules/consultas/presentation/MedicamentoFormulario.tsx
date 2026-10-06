import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';
import { SelectField } from '@/shared/ui/SelectField';
import { TextField } from '@/shared/ui/TextField';

import { CANTIDADES_DE_DOSIS, OTRA, UNIDADES_DE_DOSIS, UNIDADES_DE_DURACION, VIAS } from '../domain/CatalogoDeReceta';
import { BotonDeCantidad, ChipDeOpcion, HojaDeFrecuencia } from './controlesDeReceta';
import {
  conCantidad,
  conDuracionMovida,
  conFrecuencia,
  conUnidadDeDosis,
  conUnidadDeDuracion,
  conVia,
  dosisElegida,
  duracionElegida,
  escribirDosisAMano,
  escribirDuracionAMano,
  volverALaListaDeDosis,
  volverALaListaDeDuracion,
  type CampoDeTexto,
  type FilaDeMedicamento,
} from './receta';

const OPCIONES_DE_VIA = [...VIAS.map((v) => ({ valor: v.valor, etiqueta: v.ayuda ? `${v.etiqueta} · ${v.ayuda}` : v.etiqueta })), { valor: OTRA, etiqueta: OTRA }];
const opcionesDeUnidad = (cantidad: string | null) =>
  UNIDADES_DE_DOSIS.map((u) => ({ valor: u.valor, etiqueta: cantidad === '1' || cantidad === '½' ? u.singular : u.plural }));

/** Un medicamento de la receta: solo el nombre se escribe; lo demás se elige (listas y botones) y «Otra…» abre un campo de texto. */
export function MedicamentoFormulario({
  fila,
  numero,
  alCambiarTexto,
  alCambiarFila,
  alQuitar,
}: {
  fila: FilaDeMedicamento;
  numero: number;
  alCambiarTexto: (campo: CampoDeTexto, valor: string) => void;
  alCambiarFila: (cambio: (f: FilaDeMedicamento) => FilaDeMedicamento) => void;
  alQuitar: () => void;
}) {
  const { color, fuente, radio } = useTema();
  const [hojaDeFrecuencia, setHojaDeFrecuencia] = useState(false);

  const etiqueta = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 } as const;
  const enlace = { color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 14 } as const;
  const dosis = dosisElegida(fila);
  const duracion = duracionElegida(fila);
  const sinDosis = !fila.dosisManual && dosis.cantidad === null;

  return (
    <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, gap: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Medicamento {numero}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar medicamento ${numero}`} onPress={alQuitar} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Quitar</Text>
        </Pressable>
      </View>

      <TextField label="Nombre (obligatorio)" placeholder="Ej. Losartán" value={fila.nombre} onChangeText={(t) => alCambiarTexto('nombre', t)} autoCapitalize="sentences" />

      {fila.dosisManual ? (
        <View style={{ gap: 6 }}>
          <TextField label="Dosis" placeholder="Ej. 1 tableta" value={fila.dosis} onChangeText={(t) => alCambiarFila((f) => escribirDosisAMano(f, t))} />
          <Pressable accessibilityRole="button" onPress={() => alCambiarFila(volverALaListaDeDosis)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={enlace}>Elegir de la lista</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={etiqueta}>Dosis: cuánto se toma cada vez</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CANTIDADES_DE_DOSIS.map((c) => (
              <ChipDeOpcion key={c} texto={c} etiqueta={`Cantidad ${c}`} activo={dosis.cantidad === c} alPulsar={() => alCambiarFila((f) => conCantidad(f, c))} />
            ))}
          </View>
          <SelectField
            label="Se toma en…"
            valor={dosis.unidad ?? ''}
            opciones={opcionesDeUnidad(dosis.cantidad)}
            placeholder={sinDosis ? 'Elegir…' : ''}
            onChange={(u) => alCambiarFila((f) => conUnidadDeDosis(f, u))}
          />
        </View>
      )}

      <View style={{ gap: 8 }}>
        <SelectField
          label="Vía"
          valor={fila.viaOtra ? OTRA : fila.via}
          opciones={OPCIONES_DE_VIA}
          placeholder="Elegir…"
          onChange={(v) => alCambiarFila((f) => conVia(f, v))}
        />
        {fila.viaOtra ? <TextField label="¿Cuál vía?" placeholder="Ej. Intraarticular" value={fila.via} onChangeText={(t) => alCambiarTexto('via', t)} /> : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={etiqueta}>Frecuencia</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Frecuencia: ${fila.frecuenciaOtra ? OTRA : fila.frecuencia || 'sin elegir'}`}
          onPress={() => setHojaDeFrecuencia(true)}
          style={{ height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: fila.frecuencia || fila.frecuenciaOtra ? color.texto : color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>
            {fila.frecuenciaOtra ? OTRA : fila.frecuencia || 'Elegir…'}
          </Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 9l6 6 6-6" />
          </Svg>
        </Pressable>
        {fila.frecuenciaOtra ? <TextField label="¿Con qué frecuencia?" placeholder="Ej. Una vez por semana" value={fila.frecuencia} onChangeText={(t) => alCambiarTexto('frecuencia', t)} /> : null}
        <HojaDeFrecuencia
          visible={hojaDeFrecuencia}
          valor={fila.frecuenciaOtra ? OTRA : fila.frecuencia}
          alElegir={(v) => {
            alCambiarFila((f) => conFrecuencia(f, v));
            setHojaDeFrecuencia(false);
          }}
          alCerrar={() => setHojaDeFrecuencia(false)}
        />
      </View>

      {fila.duracionManual ? (
        <View style={{ gap: 6 }}>
          <TextField label="Duración" placeholder="Ej. 7 días" value={fila.duracion} onChangeText={(t) => alCambiarFila((f) => escribirDuracionAMano(f, t))} />
          <Pressable accessibilityRole="button" onPress={() => alCambiarFila(volverALaListaDeDuracion)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={enlace}>Elegir de la lista</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={etiqueta}>Duración</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BotonDeCantidad signo="−" etiqueta="Menos" alPulsar={() => alCambiarFila((f) => conDuracionMovida(f, -1))} />
            <Text accessibilityLabel={duracion.cantidad === null ? 'Sin elegir' : `${duracion.cantidad}`} style={{ minWidth: 52, textAlign: 'center', color: duracion.cantidad === null ? color.textoSecundario : color.texto, fontFamily: fuente.titulo, fontSize: 26 }}>
              {duracion.cantidad ?? '—'}
            </Text>
            <BotonDeCantidad signo="+" etiqueta="Más" alPulsar={() => alCambiarFila((f) => conDuracionMovida(f, 1))} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {UNIDADES_DE_DURACION.map((u) => (
              <ChipDeOpcion key={u.valor} texto={u.etiqueta} activo={duracion.unidad === u.valor} alPulsar={() => alCambiarFila((f) => conUnidadDeDuracion(f, u.valor))} />
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={etiqueta}>Indicaciones</Text>
        <TextInput
          accessibilityLabel="Indicaciones"
          placeholder="Con alimentos, evitar alcohol…"
          placeholderTextColor={color.textoSecundario}
          value={fila.indicaciones}
          onChangeText={(t) => alCambiarTexto('indicaciones', t)}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 72, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, padding: 12, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}
        />
      </View>
    </View>
  );
}
