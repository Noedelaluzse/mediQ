import boundaries from 'eslint-plugin-boundaries';
import expo from 'eslint-config-expo/flat.js';

const MOBILE = 'apps/mobile/src';

// Archivos de la plantilla de Expo con colores escritos a mano. Se migrarán a
// `shared/theme` cuando se reemplace la UI de plantilla; no agregar más aquí.
const LEGACY_COLOR_FILES = [
  `${MOBILE}/constants/theme.ts`,
  `${MOBILE}/components/animated-icon.tsx`,
  `${MOBILE}/components/themed-text.tsx`,
];

export default [
  ...expo,
  {
    settings: {
      'import/resolver': { typescript: { noWarnOnMultipleProjects: true, project: ['apps/*/tsconfig.json'] } },
    },
  },
  { ignores: ['**/dist/**', '**/.expo/**', '**/node_modules/**', 'apps/mobile/expo-env.d.ts'] },

  // RNF-15: cero colores escritos fuera de shared/theme.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [`${MOBILE}/shared/theme/**`, ...LEGACY_COLOR_FILES, '**/*.test.*'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: 'Color literal prohibido: usa un token de useTema() (docs/09-tema-y-colores-intercambiables.md).',
        },
        {
          selector: "Literal[value=/^(rgb|hsl)a?\\(/]",
          message: 'Color literal prohibido: usa un token de useTema() (docs/09-tema-y-colores-intercambiables.md).',
        },
      ],
    },
  },

  // RNF-12 y docs/08: reglas de capas (Clean Architecture).
  {
    files: [`${MOBILE}/**/*.{ts,tsx}`],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: `${MOBILE}/modules/*/domain/**`, partialMatch: false, capture: ['module'] },
        { type: 'application', pattern: `${MOBILE}/modules/*/application/**`, partialMatch: false, capture: ['module'] },
        { type: 'infrastructure', pattern: `${MOBILE}/modules/*/infrastructure/**`, partialMatch: false, capture: ['module'] },
        { type: 'presentation', pattern: `${MOBILE}/modules/*/presentation/**`, partialMatch: false, capture: ['module'] },
        { type: 'kernel', pattern: `${MOBILE}/shared/kernel/**`, partialMatch: false },
        { type: 'shared', pattern: `${MOBILE}/shared/**`, partialMatch: false },
        { type: 'container', pattern: `${MOBILE}/app/container.ts`, partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              disallow: { to: { element: { types: { anyOf: ['application', 'infrastructure', 'presentation', 'shared', 'container'] } } } },
            },
            {
              from: { element: { type: 'application' } },
              disallow: { to: { element: { types: { anyOf: ['infrastructure', 'presentation', 'container'] } } } },
            },
            {
              from: { element: { type: 'presentation' } },
              disallow: { to: { element: { types: { anyOf: ['infrastructure', 'container'] } } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              disallow: { to: { element: { types: { anyOf: ['presentation', 'container'] } } } },
            },
          ],
        },
      ],
    },
  },
];
