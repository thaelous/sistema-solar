/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// CONSTANTES ASTRONÓMICAS Y CALENDARIO REAL
// ============================================================================
const ASTRO = {
  DAYS_PER_YEAR: 365.25,               // Rotaciones terrestres por órbita solar
  EARTH_TILT_RAD: THREE.MathUtils.degToRad(23.44), // Inclinación axial terrestre
  MOON_SIDEREAL_DAYS: 27.321661,       // Periodo orbital y rotacional lunar (acoplamiento 1:1)
  MOON_SYNODIC_DAYS: 29.530589,        // Ciclo de fases lunares
  MOON_ORBIT_TILT_RAD: THREE.MathUtils.degToRad(5.14), // Inclinación orbital lunar
  EPOCH_TIME: new Date('2026-03-20T12:00:00Z').getTime(), // Época base (Equinoccio)
};

const SCALES = {
  sunRadius: 8.0,
  earthRadius: 3.2,
  moonRadius: 0.88,
  earthOrbitRadius: 115,
  moonOrbitRadius: 8.8,
};

export interface CityLocation {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

const CITIES: CityLocation[] = [
  { name: 'Ciudad de México', country: 'México', lat: 19.4326, lon: -99.1332 },
  { name: 'Meridiano de Greenwich', country: 'Reino Unido (UTC)', lat: 51.4769, lon: 0.0000 },
  { name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038 },
  { name: 'Tokio', country: 'Japón', lat: 35.6762, lon: 139.6503 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { name: 'Nueva York', country: 'EE. UU.', lat: 40.7128, lon: -74.0060 },
];

export type CameraMode =
  | 'system'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'moon'
  | 'earth_to_moon';

export interface TutorialStepHighlight {
  icon: string;
  title: string;
  text: string;
}

export interface TutorialStepDef {
  step: number;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
  highlights: TutorialStepHighlight[];
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    step: 1,
    title: '¡Bienvenido al Sistema Solar!',
    subtitle: 'Navegación y Exploración 3D',
    icon: 'fa-solid fa-globe',
    badge: 'Paso 1 de 4 • Navegación Espacial',
    description: 'Explora el espacio en 3D interactivo. Rota con un dedo (o el ratón), haz zoom con el pellizco y descubre la escala real con efemérides calculadas con física orbital Kepleriana J2000.',
    highlights: [
      { icon: 'fa-solid fa-arrows-rotate', title: 'Rotar la Vista', text: 'Arrastra con 1 dedo o clic izquierdo para orbitar en 360° alrededor de cualquier astro.' },
      { icon: 'fa-solid fa-magnifying-glass-plus', title: 'Acercar / Alejar', text: 'Pellizca con 2 dedos en móvil o gira la rueda del ratón en escritorio.' },
      { icon: 'fa-solid fa-arrows-up-down-left-right', title: 'Desplazar (Pan)', text: 'Desliza con 2 dedos o mantén clic derecho presionado.' }
    ]
  },
  {
    step: 2,
    title: 'Barra Superior e Iconos Rápidos',
    subtitle: 'Control Temporal y Modos Visuales',
    icon: 'fa-solid fa-sliders',
    badge: 'Paso 2 de 4 • Top HUD',
    description: 'Aprende a pausar el tiempo, consultar la fecha exacta, cambiar entre Modo Oscuro y Modo Claro (Espacio Blanco), activar etiquetas, órbitas y el cono de sombras.',
    highlights: [
      { icon: 'fa-solid fa-play', title: 'Play / Pausa & Fecha', text: 'Detén o reanuda la simulación; visualiza la fecha y hora UTC tabular exacta.' },
      { icon: 'fa-solid fa-circle-half-stroke', title: 'Modo Claro / Oscuro', text: 'Alterna entre fondo cósmico oscuro y el Espacio Blanco didáctico.' },
      { icon: 'fa-solid fa-tags', title: 'Etiquetas & Órbitas', text: 'Enciende o apaga nombres, órbitas elípticas, audio y realce lumínico.' }
    ]
  },
  {
    step: 3,
    title: 'Menús Desplegables (Dock)',
    subtitle: 'Tiempo, Cámaras y Capas',
    icon: 'fa-solid fa-layer-group',
    badge: 'Paso 3 de 4 • Dock Inferior',
    description: 'Descubre cómo viajar en el tiempo a velocidad acelerada, saltar a eclipses y enfocar instantáneamente cualquier planeta o la Luna desde el dock inferior.',
    highlights: [
      { icon: 'fa-solid fa-clock', title: '⏱️ Tiempo & Eclipses', text: 'Acelera desde 1x hasta 100,000x y salta a eclipses históricos o calendarios J2000.' },
      { icon: 'fa-solid fa-video', title: '🎥 Cámaras Orbitales', text: 'Enfoca automáticamente el Sol, planetas, lunas o asteroides con vuelo suave.' },
      { icon: 'fa-solid fa-layer-group', title: '✨ Capas Visuales', text: 'Satélites artificiales LEO/GEO, cinturón de asteroides y conos de sombra.' }
    ]
  },
  {
    step: 4,
    title: 'El Telescopio PiP y el Inspector',
    subtitle: 'Ficha Científica y Observación Lunar HD',
    icon: 'fa-solid fa-telescope',
    badge: 'Paso 4 de 4 • Telescopio e Inspector',
    description: 'Haz clic en cualquier planeta para abrir su ficha técnica científica, lunas y botón de vuelo. Toca el visor PiP para maximizarlo a pantalla completa y ver los cráteres en alta definición.',
    highlights: [
      { icon: 'fa-solid fa-circle-info', title: 'Inspector Planetario', text: 'Toca cualquier planeta para ver distancia, velocidad y conteo real de lunas.' },
      { icon: 'fa-solid fa-eye', title: 'Telescopio PiP (Luna)', text: 'Observa la fase lunar en tiempo real y haz clic para maximizarlo a HD.' },
      { icon: 'fa-solid fa-crosshairs', title: 'Auto-Enfocar Astro', text: 'Pulsa el botón de enfoque para viajar suavemente al astro seleccionado.' }
    ]
  }
];

export const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0);

export interface MoonDef {
  id?: string;
  name: string;
  radius: number;
  orbitRadius: number;
  periodDays: number;
  orbitPeriodDays?: number;
  colorHex: number;
}

export interface PlanetDef {
  id: string;
  name: string;
  icon: string;
  type: string;
  a_AU: number;
  e: number;
  i_deg: number;
  Omega_deg: number;
  omega_deg: number;
  M0_deg: number;
  n_deg_day: number;
  period_days: number;
  rot_period_hours: number;
  tilt_deg: number;
  temp_c: number;
  radius: number;
  surfaceColorHex: number;
  hasRings?: boolean;
  totalKnownMoons: number;
  moons: MoonDef[];
}

export function formatMoonsHeader(totalKnownMoons: number, renderedMoonsCount: number, planetId: string): string {
  if (totalKnownMoons === 0) return '0 lunas';
  if (totalKnownMoons === 1) return '1 Luna';
  if (planetId === 'jupiter') return `${totalKnownMoons} Lunas (4 galileanas en 3D)`;
  if (planetId === 'saturn') return `${totalKnownMoons} Lunas (7 mayores en 3D)`;
  if (planetId === 'uranus') return `${totalKnownMoons} Lunas (5 mayores en 3D)`;
  if (planetId === 'neptune') return `${totalKnownMoons} Lunas (3 principales en 3D)`;
  if (totalKnownMoons > renderedMoonsCount) return `${totalKnownMoons} Lunas (${renderedMoonsCount} en 3D)`;
  return `${totalKnownMoons} Lunas`;
}

export const PLANETS_CATALOGUE: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercurio',
    icon: '⚪',
    type: 'Planeta Rocoso',
    a_AU: 0.38709927,
    e: 0.20563593,
    i_deg: 7.004979,
    Omega_deg: 48.330765,
    omega_deg: 29.12478,
    M0_deg: 174.7948,
    n_deg_day: 4.0923344,
    period_days: 87.969,
    rot_period_hours: 1407.6,
    tilt_deg: 0.034,
    temp_c: 167,
    radius: 1.35,
    surfaceColorHex: 0x9ca3af,
    hasRings: false,
    totalKnownMoons: 0,
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    icon: '🟡',
    type: 'Planeta Rocoso',
    a_AU: 0.72333566,
    e: 0.00677672,
    i_deg: 3.394676,
    Omega_deg: 76.679842,
    omega_deg: 54.88365,
    M0_deg: 50.1166,
    n_deg_day: 1.6021305,
    period_days: 224.701,
    rot_period_hours: -5832.5,
    tilt_deg: 177.36,
    temp_c: 464,
    radius: 3.1,
    surfaceColorHex: 0xfef08a,
    hasRings: false,
    totalKnownMoons: 0,
    moons: [],
  },
  {
    id: 'mars',
    name: 'Marte',
    icon: '🔴',
    type: 'Planeta Rocoso',
    a_AU: 1.52371034,
    e: 0.09339410,
    i_deg: 1.849691,
    Omega_deg: 49.559538,
    omega_deg: 286.5016,
    M0_deg: 19.3730,
    n_deg_day: 0.524039,
    period_days: 686.98,
    rot_period_hours: 24.62,
    tilt_deg: 25.19,
    temp_c: -65,
    radius: 1.85,
    surfaceColorHex: 0xc2410c,
    hasRings: false,
    totalKnownMoons: 2,
    moons: [
      { id: 'phobos', name: 'Fobos', radius: 0.28, orbitRadius: 3.2, periodDays: 0.3189, colorHex: 0x78716c },
      { id: 'deimos', name: 'Deimos', radius: 0.20, orbitRadius: 5.5, periodDays: 1.263, colorHex: 0xa8a29e },
    ],
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    icon: '🟠',
    type: 'Gigante Gaseoso',
    a_AU: 5.2028870,
    e: 0.04838624,
    i_deg: 1.304396,
    Omega_deg: 100.473909,
    omega_deg: 273.867,
    M0_deg: 20.020,
    n_deg_day: 0.083085,
    period_days: 4332.59,
    rot_period_hours: 9.93,
    tilt_deg: 3.13,
    temp_c: -110,
    radius: 8.2,
    surfaceColorHex: 0xd97706,
    hasRings: false,
    totalKnownMoons: 95,
    moons: [
      { id: 'io', name: 'Ío', radius: 0.70, orbitRadius: 12.5, periodDays: 1.769, colorHex: 0xfacc15 },
      { id: 'europa', name: 'Europa', radius: 0.60, orbitRadius: 16.0, periodDays: 3.551, colorHex: 0xe0f2fe },
      { id: 'ganymede', name: 'Ganimedes', radius: 0.95, orbitRadius: 21.0, periodDays: 7.155, colorHex: 0x94a3b8 },
      { id: 'callisto', name: 'Calisto', radius: 0.88, orbitRadius: 27.5, periodDays: 16.689, colorHex: 0x64748b },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturno',
    icon: '🪐',
    type: 'Gigante Gaseoso',
    a_AU: 9.53667594,
    e: 0.05386179,
    i_deg: 2.485992,
    Omega_deg: 113.662424,
    omega_deg: 339.392,
    M0_deg: 317.020,
    n_deg_day: 0.033444,
    period_days: 10759.22,
    rot_period_hours: 10.66,
    tilt_deg: 26.73,
    temp_c: -140,
    radius: 6.8,
    surfaceColorHex: 0xfde047,
    hasRings: true,
    totalKnownMoons: 146,
    moons: [
      { id: 'mimas', name: 'Mimas', radius: 0.30, orbitRadius: 19.5, periodDays: 0.942, colorHex: 0xcbd5e1 },
      { id: 'enceladus', name: 'Encélado', radius: 0.38, orbitRadius: 22.0, periodDays: 1.370, colorHex: 0xffffff },
      { id: 'tethys', name: 'Tetis', radius: 0.44, orbitRadius: 24.5, periodDays: 1.888, colorHex: 0xe2e8f0 },
      { id: 'dione', name: 'Dione', radius: 0.46, orbitRadius: 27.5, periodDays: 2.737, colorHex: 0xcfd8dc },
      { id: 'rhea', name: 'Rea', radius: 0.55, orbitRadius: 31.0, periodDays: 4.518, colorHex: 0xb0bec5 },
      { id: 'titan', name: 'Titán', radius: 0.94, orbitRadius: 37.0, periodDays: 15.945, colorHex: 0xf59e0b },
      { id: 'iapetus', name: 'Jápeto', radius: 0.50, orbitRadius: 46.0, periodDays: 79.32, colorHex: 0x475569 },
    ],
  },
  {
    id: 'uranus',
    name: 'Urano',
    icon: '🔷',
    type: 'Gigante Helado',
    a_AU: 19.19126393,
    e: 0.04716771,
    i_deg: 0.76986,
    Omega_deg: 74.22988,
    omega_deg: 96.73436,
    M0_deg: 142.2386,
    n_deg_day: 0.011728,
    period_days: 30685.4,
    rot_period_hours: -17.24,
    tilt_deg: 97.77,
    temp_c: -195,
    radius: 4.5,
    surfaceColorHex: 0x67e8f9,
    hasRings: true,
    totalKnownMoons: 28,
    moons: [
      { id: 'miranda', name: 'Miranda', radius: 0.34, orbitRadius: 9.5, periodDays: 1.413, colorHex: 0x94a3b8 },
      { id: 'ariel', name: 'Ariel', radius: 0.46, orbitRadius: 12.0, periodDays: 2.520, colorHex: 0xe2e8f0 },
      { id: 'umbriel', name: 'Umbriel', radius: 0.44, orbitRadius: 14.5, periodDays: 4.144, colorHex: 0x475569 },
      { id: 'titania', name: 'Titania', radius: 0.60, orbitRadius: 18.0, periodDays: 8.706, colorHex: 0xcfd8dc },
      { id: 'oberon', name: 'Oberón', radius: 0.56, orbitRadius: 22.0, periodDays: 13.463, colorHex: 0x94a3b8 },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    icon: '🔵',
    type: 'Gigante Helado',
    a_AU: 30.06896348,
    e: 0.00858587,
    i_deg: 1.76917,
    Omega_deg: 131.72169,
    omega_deg: 273.24966,
    M0_deg: 256.228,
    n_deg_day: 0.005981,
    period_days: 60189.0,
    rot_period_hours: 16.11,
    tilt_deg: 28.32,
    temp_c: -201,
    radius: 4.4,
    surfaceColorHex: 0x2563eb,
    hasRings: false,
    totalKnownMoons: 16,
    moons: [
      { id: 'proteus', name: 'Proteo', radius: 0.32, orbitRadius: 8.5, periodDays: 1.122, colorHex: 0x64748b },
      { id: 'triton', name: 'Tritón', radius: 0.72, orbitRadius: 14.5, periodDays: -5.877, colorHex: 0xdbeafe },
      { id: 'nereid', name: 'Nereida', radius: 0.28, orbitRadius: 24.0, periodDays: 360.13, colorHex: 0x94a3b8 },
    ],
  },
  {
    id: 'pluto',
    name: 'Plutón',
    icon: '🟤',
    type: 'Planeta Enano',
    a_AU: 39.482,
    e: 0.2488,
    i_deg: 17.16,
    Omega_deg: 110.3,
    omega_deg: 113.8,
    M0_deg: 14.88,
    n_deg_day: 0.00396,
    period_days: 90560,
    rot_period_hours: -153.3,
    tilt_deg: 122.53,
    temp_c: -229,
    radius: 1.15,
    surfaceColorHex: 0xd97706,
    hasRings: false,
    totalKnownMoons: 5,
    moons: [
      { id: 'charon', name: 'Caronte', radius: 0.58, orbitRadius: 3.2, periodDays: 6.387, colorHex: 0x78716c },
    ],
  },
];

export const EARTH_EPHEMERIS: PlanetDef = {
  id: 'earth',
  name: 'Tierra',
  icon: '🌍',
  type: 'Planeta Terrestre',
  a_AU: 1.00000261,
  e: 0.01671123,
  i_deg: 0.00005,
  Omega_deg: -11.26064,
  omega_deg: 102.94719,
  M0_deg: 357.5172,
  n_deg_day: 0.9856003,
  period_days: 365.256,
  rot_period_hours: 23.934,
  tilt_deg: 23.44,
  temp_c: 15,
  radius: 3.2,
  surfaceColorHex: 0x38bdf8,
  hasRings: false,
  totalKnownMoons: 1,
  moons: [
    { id: 'moon', name: 'Luna', radius: 0.88, orbitRadius: 8.8, periodDays: 27.32, colorHex: 0xe2e8f0 },
  ],
};

// ============================================================================
// CATÁLOGO DE EVENTOS ASTRONÓMICOS HISTÓRICOS Y DEL SIGLO XX
// ============================================================================
export interface HistoricalEvent {
  id: string;
  title: string;
  category: 'eclipse_20th' | 'eclipse_modern' | 'space_milestone' | 'historical_astronomy';
  categoryLabel: string;
  badgeClass: string;
  dateUtcIso: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationName: string;
  lat?: number;
  lon?: number;
  recommendedCamera: CameraMode;
  summary: string;
  historicalSignificance: string;
  technicalSpecs: string;
}

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    id: 'eclipse_mexico_1991',
    title: 'Gran Eclipse Solar Total de México (Siglo XX)',
    category: 'eclipse_20th',
    categoryLabel: 'Eclipse del Siglo XX',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dateUtcIso: '1991-07-11T19:07:00Z',
    year: 1991,
    month: 7,
    day: 11,
    hour: 19,
    minute: 7,
    locationName: 'La Paz, B.C.S. y Centro de México',
    lat: 24.1426,
    lon: -110.3128,
    recommendedCamera: 'earth',
    summary: 'El eclipse solar total más largo del siglo XX en Norteamérica, con casi 7 minutos de oscuridad absoluta.',
    historicalSignificance: 'El 11 de julio de 1991, la sombra de la Luna atravesó el Pacífico, Baja California Sur, Nayarit y la Ciudad de México. El alumbrado público se encendió automáticamente, la temperatura descendió bruscamente y millones de personas admiraron la corona solar y las perlas de Baily en pleno mediodía.',
    technicalSpecs: 'Totalidad máxima: 6 min 53 s • Saros 136 • Ancho de la sombra: 258 km',
  },
  {
    id: 'eclipse_eddington_1919',
    title: 'Eclipse de Eddington y Einstein (Prueba de la Relatividad)',
    category: 'eclipse_20th',
    categoryLabel: 'Eclipse del Siglo XX',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dateUtcIso: '1919-05-29T13:08:00Z',
    year: 1919,
    month: 5,
    day: 29,
    hour: 13,
    minute: 8,
    locationName: 'Sobral (Brasil) e Isla de Príncipe (Golfo de Guinea)',
    lat: -3.6894,
    lon: -40.3524,
    recommendedCamera: 'earth',
    summary: 'El evento astronómico cumbre del siglo XX que comprobó empíricamente la Relatividad General de Albert Einstein.',
    historicalSignificance: 'Sir Arthur Eddington y Andrew Crommelin fotografiaron las estrellas del cúmulo de las Híades durante el eclipse. Al medir la deflexión de los rayos de luz estelar provocada por la curvatura del espacio-tiempo cerca de la masa del Sol, se confirmó la predicción de Einstein, revolucionando para siempre la física clásica.',
    technicalSpecs: 'Totalidad: 6 min 51 s • Saros 127 • Deflexión estelar medida: 1.75 segundos de arco',
  },
  {
    id: 'eclipse_europa_1999',
    title: 'Eclipse Solar Total de Fin de Milenio en Europa',
    category: 'eclipse_20th',
    categoryLabel: 'Eclipse del Siglo XX',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dateUtcIso: '1999-08-11T11:03:00Z',
    year: 1999,
    month: 8,
    day: 11,
    hour: 11,
    minute: 3,
    locationName: 'Europa Central (Rumanía, Francia, Alemania, Reino Unido)',
    lat: 45.12,
    lon: 24.90,
    recommendedCamera: 'earth',
    summary: 'El último gran eclipse solar total del siglo XX y del segundo milenio, observado por cientos de millones de personas.',
    historicalSignificance: 'El 11 de agosto de 1999, la umbra lunar barrió Cornualles, Normandía, Múnich, Viena, Bucarest y prosiguió hacia Turquía e India. Fue el primer eclipse con cobertura televisiva global en directo e internet masivo antes del cambio de milenio.',
    technicalSpecs: 'Totalidad máxima: 2 min 23 s • Saros 145 • Punto de máximo: Râmnicu Vâlcea, Rumanía',
  },
  {
    id: 'apollo_11_1969',
    title: 'Alunizaje Histórico de la Misión Apolo 11',
    category: 'space_milestone',
    categoryLabel: 'Hito Espacial',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    dateUtcIso: '1969-07-20T20:17:40Z',
    year: 1969,
    month: 7,
    day: 20,
    hour: 20,
    minute: 17,
    locationName: 'Mare Tranquillitatis (Mar de la Tranquilidad), Luna',
    recommendedCamera: 'moon',
    summary: 'Primera vez que la humanidad pisó la superficie de otro mundo: "El Águila ha alunizado".',
    historicalSignificance: 'Neil Armstrong y Edwin "Buzz" Aldrin posaron el módulo lunar Eagle a las 20:17:40 UTC. Horas más tarde, Armstrong descendió la escalerilla pronunciando: "Un pequeño paso para el hombre, un gran salto para la humanidad". Desde la superficie lunar, la Tierra lucía como una frágil canica azul brillante.',
    technicalSpecs: 'Coordenadas lunares: 0.67408° N, 23.47297° E • Duración estancia lunar: 21 h 36 min',
  },
  {
    id: 'eclipse_norteamerica_2024',
    title: 'Gran Eclipse Solar Total de Norteamérica',
    category: 'eclipse_modern',
    categoryLabel: 'Eclipse del Siglo XXI',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dateUtcIso: '2024-04-08T18:17:00Z',
    year: 2024,
    month: 4,
    day: 8,
    hour: 18,
    minute: 17,
    locationName: 'Mazatlán, Sinaloa, México (Costa del Pacífico)',
    lat: 23.23,
    lon: -106.41,
    recommendedCamera: 'earth',
    summary: 'Eclipse solar total que cruzó México, EE. UU. y Canadá durante el máximo del ciclo solar 25.',
    historicalSignificance: 'Mazatlán fue la primera ciudad continental en recibir la umbra. La coincidencia con el máximo de actividad solar permitió ver prominencias solares rojizas gigantescas a simple vista alrededor del limbo lunar oscuro durante la totalidad.',
    technicalSpecs: 'Totalidad: 4 min 28 s • Saros 139 • Ancho franja: 198 km',
  },
  {
    id: 'eclipse_espana_2026',
    title: 'Próximo Eclipse Solar Total de España y el Ártico',
    category: 'eclipse_modern',
    categoryLabel: 'Eclipse Futuro',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dateUtcIso: '2026-08-12T17:46:00Z',
    year: 2026,
    month: 8,
    day: 12,
    hour: 17,
    minute: 46,
    locationName: 'Valladolid, Burgos, Zaragoza y Baleares (España)',
    lat: 41.65,
    lon: -4.72,
    recommendedCamera: 'earth',
    summary: 'El retorno de los eclipses totales a la Europa continental tras 27 años, coincidiendo con el atardecer.',
    historicalSignificance: 'La franja atravesará el norte y centro de la península ibérica. Debido a la baja elevación del Sol sobre el horizonte (unos 10° a 2°), se proyectará una puesta de sol eclipsada espectacular sobre el paisaje español y el mar Balear.',
    technicalSpecs: 'Totalidad: 2 min 18 s • Saros 126 • Altura solar baja: 10° sobre el horizonte',
  },
  {
    id: 'eclipse_luxor_2027',
    title: 'Eclipse del Siglo XXI en Luxor, Egipto',
    category: 'eclipse_modern',
    categoryLabel: 'Eclipse Futuro',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dateUtcIso: '2027-08-02T10:07:00Z',
    year: 2027,
    month: 8,
    day: 2,
    hour: 10,
    minute: 7,
    locationName: 'Valle de los Reyes y Templos de Luxor, Egipto',
    lat: 25.6872,
    lon: 32.6396,
    recommendedCamera: 'earth',
    summary: 'El eclipse total más largo en tierra de todo el siglo XXI: más de 6 minutos de totalidad.',
    historicalSignificance: 'Pasará sobre el estrecho de Gibraltar, el norte de África y directamente sobre los colosales templos faraónicos de Luxor y Karnak con una probabilidad meteorológica de nubes de casi 0%, prometiendo las mejores condiciones de observación de la era moderna.',
    technicalSpecs: 'Totalidad: 6 min 22 s • Saros 136 • Sombra máxima en el desierto oriental egipcio',
  },
  {
    id: 'galileo_lunas_1610',
    title: 'Descubrimiento de las Lunas Galileanas (Galileo)',
    category: 'historical_astronomy',
    categoryLabel: 'Astronomía Histórica',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dateUtcIso: '1610-01-07T21:00:00Z',
    year: 1610,
    month: 1,
    day: 7,
    hour: 21,
    minute: 0,
    locationName: 'Padua, República de Venecia (Italia)',
    recommendedCamera: 'jupiter',
    summary: 'Galileo Galilei observa que 4 "estrellas mediceas" orbitan a Júpiter, refutando el geocentrismo.',
    historicalSignificance: 'El 7 de enero de 1610, Galileo observó por primera vez con su telescopio de 20 aumentos tres puntos de luz alineados junto a Júpiter, y días después el cuarto. El hallazgo de que otros cuerpos celestes orbitaban un centro diferente a la Tierra asestó el golpe definitivo al modelo ptolemaico e inauguró la astronomía telescópica.',
    technicalSpecs: 'Descubrimiento de Ío, Europa, Ganímedes y Calisto • Publicado en Sidereus Nuncius',
  },
];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getJulianDateNumber(date: Date): number {
  return Number((date.getTime() / 86400000 + 2440587.5).toFixed(2));
}

export function getScaledOrbitRadius(a_AU: number, scientificScale: boolean): number {
  if (scientificScale) {
    // Escala Científica Proporcional Estricta: 1 UA = 180 unidades
    return a_AU * 180.0;
  }

  // Escala Didáctica Visual Calibrada: Espaciado amplio garantizado entre órbitas
  // Sol (r=8), Mercurio (38), Venus (72), Tierra (115, Δ=43 con Venus, Δ=50 con Marte),
  // Marte (165), Cinturón de Asteroides (205-245), Júpiter (310), Saturno (410),
  // Urano (510), Neptuno (600), Plutón (685)
  const ANCHORS = [
    { au: 0.0, r: 0 },
    { au: 0.387, r: 38 },
    { au: 0.723, r: 72 },
    { au: 1.000, r: 115 },
    { au: 1.524, r: 165 },
    { au: 2.200, r: 205 },
    { au: 2.800, r: 245 },
    { au: 5.203, r: 310 },
    { au: 9.537, r: 410 },
    { au: 19.191, r: 510 },
    { au: 30.069, r: 600 },
    { au: 39.482, r: 685 },
  ];

  if (a_AU <= 0) return 0;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const p0 = ANCHORS[i];
    const p1 = ANCHORS[i + 1];
    if (a_AU >= p0.au && a_AU <= p1.au) {
      const t = (a_AU - p0.au) / (p1.au - p0.au);
      return p0.r + t * (p1.r - p0.r);
    }
  }
  const last = ANCHORS[ANCHORS.length - 1];
  return last.r + (a_AU - last.au) * 8.5;
}

export function solveKepler(M: number, e: number): number {
  let E = M;
  for (let k = 0; k < 5; k++) {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1.0 - e * Math.cos(E);
    E = E - f / fPrime;
  }
  return E;
}

export function computeHeliocentricPosition(def: PlanetDef, curDate: Date, scientificScale: boolean) {
  const d = (curDate.getTime() - J2000_EPOCH) / 86400000;
  const M_deg = ((def.M0_deg + def.n_deg_day * d) % 360 + 360) % 360;
  const M_rad = THREE.MathUtils.degToRad(M_deg);
  const E_rad = solveKepler(M_rad, def.e);

  const nu_rad = 2 * Math.atan2(
    Math.sqrt(1 + def.e) * Math.sin(E_rad / 2),
    Math.sqrt(1 - def.e) * Math.cos(E_rad / 2)
  );
  const r_AU = def.a_AU * (1 - def.e * Math.cos(E_rad));
  const r_scaled = getScaledOrbitRadius(r_AU, scientificScale);

  const u_rad = THREE.MathUtils.degToRad(def.omega_deg) + nu_rad;
  const i_rad = THREE.MathUtils.degToRad(def.i_deg);
  const Om_rad = THREE.MathUtils.degToRad(def.Omega_deg);

  const x = r_scaled * (Math.cos(Om_rad) * Math.cos(u_rad) - Math.sin(Om_rad) * Math.sin(u_rad) * Math.cos(i_rad));
  const y = r_scaled * (Math.sin(u_rad) * Math.sin(i_rad));
  const z = r_scaled * (Math.sin(Om_rad) * Math.cos(u_rad) + Math.cos(Om_rad) * Math.sin(u_rad) * Math.cos(i_rad));

  const v_kms = 29.78 * Math.sqrt(Math.max(0.01, 2.0 / r_AU - 1.0 / def.a_AU));

  return {
    pos: new THREE.Vector3(x, y, z),
    r_AU,
    v_kms,
  };
}

export interface PlanetObject {
  def: PlanetDef;
  orbitNode: THREE.Group;
  tiltNode: THREE.Group;
  planetMesh: THREE.Object3D;
  orbitLine: THREE.Line;
  ringsMesh?: THREE.Mesh;
  moons: {
    def: MoonDef;
    orbitNode: THREE.Group;
    mesh: THREE.Mesh;
    orbitLine: THREE.Line;
  }[];
}

export interface EclipseDetection {
  active: boolean;
  type: 'Total' | 'Anular' | 'Parcial' | 'Ninguno';
  obscuration: number;
  sepDeg: string;
  contactDeg: string;
  visibleFromLocation: boolean;
}

// ============================================================================
// SATÉLITES ARTIFICIALES Y CONSTELACIONES ASTRONÓMICAS
// ============================================================================
export interface SatelliteDef {
  id: string;
  name: string;
  type: string; // 'LEO' | 'MEO' | 'HEO' | 'GEO'
  a: number; // Semieje mayor (Radio terrestre = 3.3)
  e: number; // Excentricidad orbital
  i: number; // Inclinación (radianes)
  raan: number; // Longitud del nodo ascendente (radianes)
  argPer: number; // Argumento del periastro (radianes)
  meanMotion: number; // Movimiento medio (rad / día simulado)
  m0: number; // Anomalía media inicial (radianes)
  color: string;
  colorHex: number;
}

export const SATELLITE_DEFS: SatelliteDef[] = [
  {
    id: 'iss',
    name: 'ISS (Estación Espacial Internacional)',
    type: 'LEO',
    a: 3.9,
    e: 0.012,
    i: THREE.MathUtils.degToRad(51.6),
    raan: THREE.MathUtils.degToRad(45),
    argPer: THREE.MathUtils.degToRad(0),
    meanMotion: 32.0, // Muy rápida (90 min por órbita en la realidad)
    m0: 0.8,
    color: '#38bdf8',
    colorHex: 0x38bdf8,
  },
  {
    id: 'hubble',
    name: 'Telescopio Espacial Hubble',
    type: 'LEO',
    a: 4.4,
    e: 0.015,
    i: THREE.MathUtils.degToRad(28.5),
    raan: THREE.MathUtils.degToRad(120),
    argPer: THREE.MathUtils.degToRad(30),
    meanMotion: 26.0,
    m0: 2.1,
    color: '#60a5fa',
    colorHex: 0x60a5fa,
  },
  {
    id: 'starlink',
    name: 'Constelación Starlink',
    type: 'LEO',
    a: 4.9,
    e: 0.02,
    i: THREE.MathUtils.degToRad(53.2),
    raan: THREE.MathUtils.degToRad(210),
    argPer: THREE.MathUtils.degToRad(60),
    meanMotion: 22.0,
    m0: 3.5,
    color: '#22d3ee',
    colorHex: 0x22d3ee,
  },
  {
    id: 'gps',
    name: 'GPS Navstar Block III',
    type: 'MEO',
    a: 7.5,
    e: 0.025,
    i: THREE.MathUtils.degToRad(55.0),
    raan: THREE.MathUtils.degToRad(300),
    argPer: THREE.MathUtils.degToRad(45),
    meanMotion: 12.0, // Período ~12h
    m0: 1.2,
    color: '#34d399',
    colorHex: 0x34d399,
  },
  {
    id: 'molniya',
    name: 'Molniya-1 (Órbita Elíptica Alta)',
    type: 'HEO',
    a: 9.5,
    e: 0.60, // Gran excentricidad
    i: THREE.MathUtils.degToRad(63.4),
    raan: THREE.MathUtils.degToRad(90),
    argPer: THREE.MathUtils.degToRad(270),
    meanMotion: 8.5,
    m0: 0.0,
    color: '#fbbf24',
    colorHex: 0xfbbf24,
  },
  {
    id: 'goes',
    name: 'GOES-16 (Órbita Geoestacionaria)',
    type: 'GEO',
    a: 12.5,
    e: 0.0,
    i: THREE.MathUtils.degToRad(0.0), // Ecuatorial
    raan: 0,
    argPer: 0,
    meanMotion: Math.PI * 2, // Síncrono exacto con la rotación diurna terrestre (24h)
    m0: 1.5,
    color: '#c084fc',
    colorHex: 0xc084fc,
  },
];

// SINTETIZADOR DE AUDIO ESPACIAL (Web Audio API)
// ============================================================================
class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  public isMuted: boolean = true;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // La1 (55 Hz)

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(82.41, this.ctx.currentTime); // Mi2 (82.4 Hz)

    this.osc1.connect(filter);
    this.osc2.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
  }

  public toggle(): boolean {
    this.init();
    if (!this.ctx || !this.droneGain) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0 : 0.12;
    this.droneGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.4);
    return !this.isMuted;
  }

  public playChime(type: 'solar' | 'lunar' | 'click') {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    if (type === 'solar') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    } else if (type === 'lunar') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(840, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  }
}

const audioEngine = new SpaceAudioEngine();

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);

  // Estados Reactivos
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('system');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simDays, setSimDays] = useState<number>(0);
  const [daysPerSecond, setDaysPerSecond] = useState<number>(1.0);
  const [direction, setDirection] = useState<number>(1);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isPipOpen, setIsPipOpen] = useState<boolean>(false);
  const [isPipMaximized, setIsPipMaximized] = useState<boolean>(false);

  // Calendario Avanzado y Eventos Históricos del Siglo XX
  const [isAdvancedCalendarOpen, setIsAdvancedCalendarOpen] = useState<boolean>(false);
  const [calendarTab, setCalendarTab] = useState<'events' | 'picker'>('events');
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(3); // 1-12
  const [calDay, setCalDay] = useState<number>(20);
  const [calHour, setCalHour] = useState<number>(12);
  const [calMinute, setCalMinute] = useState<number>(0);
  const [selectedEventCategory, setSelectedEventCategory] = useState<string>('all');
  const [selectedHistoricalEvent, setSelectedHistoricalEvent] = useState<HistoricalEvent | null>(HISTORICAL_EVENTS[0]);
  const [activeHistoricalEventCard, setActiveHistoricalEventCard] = useState<HistoricalEvent | null>(HISTORICAL_EVENTS[0]);

  // Geolocalización y GPS (Por defecto Ciudad de México neutral)
  const [selectedCity, setSelectedCity] = useState<CityLocation>(CITIES[0]);
  const [customLat, setCustomLat] = useState<number>(19.4326);
  const [customLon, setCustomLon] = useState<number>(-99.1332);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Pantalla de Bienvenida Cinematográfica (Splash Screen de 3 segundos)
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [splashFade, setSplashFade] = useState<boolean>(false);
  const splashCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tutorial Dinámico Interactivo (Onboarding Walkthrough Tour)
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [dontShowTutorialAgain, setDontShowTutorialAgain] = useState<boolean>(false);

  const handleCloseTutorial = (fromFinishButton = false) => {
    if (fromFinishButton && dontShowTutorialAgain) {
      try {
        localStorage.setItem('solar3d_skip_tutorial', 'true');
      } catch {
        // Ignorar en caso de restricciones de almacenamiento
      }
    }
    setShowTutorial(false);
    setTutorialStep(0);
    audioEngine.playChime('click');
  };

  useEffect(() => {
    // Temporizador de 3000ms antes de desvanecer suavemente (0.8s)
    const fadeTimer = setTimeout(() => {
      setSplashFade(true);
    }, 3000);

    const removeTimer = setTimeout(() => {
      setShowSplashScreen(false);
      try {
        const skip = localStorage.getItem('solar3d_skip_tutorial') === 'true';
        if (!skip) {
          setShowTutorial(true);
          setTutorialStep(0);
        }
      } catch {
        setShowTutorial(true);
      }
    }, 3800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Animación del campo de partículas estelares y siluetas planetarias en el Splash Screen
  useEffect(() => {
    if (!showSplashScreen || !splashCanvasRef.current) return;
    const canvas = splashCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generar partículas cósmicas
    const particleCount = 130;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      size: Math.random() * 2.2 + 0.6,
      alpha: Math.random() * 0.7 + 0.3,
      glow: Math.random() * 8 + 3,
      color: Math.random() > 0.35 ? '#ffffff' : Math.random() > 0.5 ? '#38bdf8' : '#fbbf24',
      phase: Math.random() * Math.PI * 2,
      orbitSpeed: (Math.random() - 0.5) * 0.02,
      orbitRadius: Math.random() * 60 + 20,
    }));

    // Siluetas planetarias místicas (mini Saturno y orbes celestes flotantes)
    const planets = [
      { x: width * 0.22, y: height * 0.32, radius: 18, ringR1: 26, ringR2: 42, angle: -0.32, color: '#38bdf8', opacity: 0.22 },
      { x: width * 0.78, y: height * 0.68, radius: 24, ringR1: 34, ringR2: 56, angle: 0.45, color: '#f59e0b', opacity: 0.25 },
      { x: width * 0.75, y: height * 0.28, radius: 12, ringR1: 0, ringR2: 0, angle: 0, color: '#60a5fa', opacity: 0.28 },
      { x: width * 0.25, y: height * 0.72, radius: 14, ringR1: 0, ringR2: 0, angle: 0, color: '#ec4899', opacity: 0.20 },
    ];

    let t = 0;
    const render = () => {
      t += 0.016;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Dibujar siluetas cósmicas con anillos translúcidos (estilo planetario elegante)
      planets.forEach((p, idx) => {
        const floatY = p.y + Math.sin(t * 1.2 + idx) * 8;
        const floatX = p.x + Math.cos(t * 0.8 + idx) * 6;

        // Resplandor del planeta
        const grad = ctx.createRadialGradient(floatX, floatY, 2, floatX, floatY, p.radius * 2.2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(floatX, floatY, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Esfera planetaria
        ctx.fillStyle = '#050b1a';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(floatX, floatY, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Anillos si los tiene (tipo Saturno elegante)
        if (p.ringR2 > 0) {
          ctx.save();
          ctx.translate(floatX, floatY);
          ctx.rotate(p.angle);
          ctx.scale(1, 0.32);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, p.ringR2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, p.ringR1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Dibujar partículas cósmicas flotantes
      particles.forEach((pt) => {
        pt.phase += pt.orbitSpeed;
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.x < 0) pt.x = width;
        if (pt.x > width) pt.x = 0;
        if (pt.y < 0) pt.y = height;
        if (pt.y > height) pt.y = 0;

        const pulse = (Math.sin(t * 2.5 + pt.phase) + 1) * 0.5;
        const currentAlpha = pt.alpha * (0.6 + pulse * 0.4);

        ctx.shadowBlur = pt.glow;
        ctx.shadowColor = pt.color;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showSplashScreen]);

  // Capas Visuales 3D (Estado inicial 100% limpio por defecto)
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showTidalLine, setShowTidalLine] = useState<boolean>(true);
  const [showShadowCones, setShowShadowCones] = useState<boolean>(true);
  const [showCityLights, setShowCityLights] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showPin, setShowPin] = useState<boolean>(true);
  const [showSatellites, setShowSatellites] = useState<boolean>(false);
  const [showAsteroids, setShowAsteroids] = useState<boolean>(true);
  const [planetaryBoost, setPlanetaryBoost] = useState<boolean>(true);
  const [scientificScale, setScientificScale] = useState<boolean>(false);
  const [focusedPlanetId, setFocusedPlanetId] = useState<string | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inspectedBodyKey, setInspectedBodyKey] = useState<string | null>(null);
  const [inspectorTelemetry, setInspectorTelemetry] = useState<{ distSun: string; distEarth: string; speed: string }>({
    distSun: '',
    distEarth: '',
    speed: '',
  });

  // Eclipses y Dynamic Island
  const [solarEclipse, setSolarEclipse] = useState<EclipseDetection>({
    active: false,
    type: 'Ninguno',
    obscuration: 0,
    sepDeg: '0.00',
    contactDeg: '0.00',
    visibleFromLocation: false,
  });
  const [lunarEclipse, setLunarEclipse] = useState<EclipseDetection>({
    active: false,
    type: 'Ninguno',
    obscuration: 0,
    sepDeg: '0.00',
    contactDeg: '0.00',
    visibleFromLocation: false,
  });
  const [dismissedAlert, setDismissedAlert] = useState<string | null>(null);

  // Telemetría
  const [telemetry, setTelemetry] = useState({
    earthRotations: '0.00',
    earthOrbits: '0.000',
    orbitPct: '0.0',
    season: 'Primavera (HN)',
    moonOrbits: '0.000',
    moonRotations: '0.000',
    moonPhaseName: '🌑 Luna Nueva',
    moonIllum: '0%',
    moonAge: '0.0',
    moonPhaseFrac: 0,
    isLocalDaytime: true,
  });

  // Etiquetas 3D Proyectadas
  const [labelsPos, setLabelsPos] = useState<Record<string, { x: number; y: number; visible: boolean }>>({
    sun: { x: 0, y: 0, visible: false },
    earth: { x: 0, y: 0, visible: false },
    moon: { x: 0, y: 0, visible: false },
    pin: { x: 0, y: 0, visible: false },
    mercury: { x: 0, y: 0, visible: false },
    venus: { x: 0, y: 0, visible: false },
    mars: { x: 0, y: 0, visible: false },
    jupiter: { x: 0, y: 0, visible: false },
    saturn: { x: 0, y: 0, visible: false },
    uranus: { x: 0, y: 0, visible: false },
    neptune: { x: 0, y: 0, visible: false },
    pluto: { x: 0, y: 0, visible: false },
  });

  // Fecha y Hora simulada en calendario real
  const currentSimDate = useMemo(() => {
    return new Date(ASTRO.EPOCH_TIME + simDays * 86400000);
  }, [simDays]);

  // Planeta enfocado en el Inspector (100% controlable con bandera explícita isInspectorOpen)
  const focusedPlanet = useMemo(() => {
    if (!isInspectorOpen || !inspectedBodyKey) return null;
    if (inspectedBodyKey === 'earth') return EARTH_EPHEMERIS;
    return PLANETS_CATALOGUE.find((p) => p.id === inspectedBodyKey) || null;
  }, [isInspectorOpen, inspectedBodyKey]);

  // Soporte para cerrar el Inspector con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsInspectorOpen(false);
        setInspectedBodyKey(null);
        setFocusedPlanetId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Variables de seguimiento de cámara
  const simStateRef = useRef({
    simDays: 0,
    daysPerSecond: 1.0,
    direction: 1,
    isPlaying: true,
    cameraMode: 'system' as CameraMode,
    isLightMode: false,
    showLabels: false,
    showOrbits: true,
    showTidalLine: true,
    showShadowCones: true,
    showCityLights: true,
    showAxes: true,
    showPin: true,
    showSatellites: false,
    showAsteroids: true,
    planetaryBoost: true,
    scientificScale: false,
    focusedPlanetId: null as string | null,
    isInspectorOpen: false,
    inspectedBodyKey: null as string | null,
    lat: 19.4326,
    lon: -99.1332,
  });

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    pipCamera: THREE.PerspectiveCamera;
    pipRenderer: THREE.WebGLRenderer | null;
    sunMesh: THREE.Mesh;
    sunCoronaSprite: THREE.Sprite;
    sunLight: THREE.PointLight;
    ambientLight: THREE.AmbientLight;
    starfieldGroup: THREE.Group;
    earthOrbitNode: THREE.Group;
    earthTiltNode: THREE.Group;
    earthMesh: THREE.Mesh;
    earthMaterial: THREE.MeshPhongMaterial;
    earthClouds: THREE.Mesh;
    earthCloudsMaterial: THREE.MeshStandardMaterial;
    earthAtmosphere: THREE.Mesh;
    earthAxisLine: THREE.Group;
    earthPinGroup: THREE.Group;
    pinPulseMesh: THREE.Mesh;
    earthUmbraCone: THREE.Mesh;
    earthPenumbraCone: THREE.Mesh;
    moonUmbraCone: THREE.Mesh;
    moonOrbitPlaneNode: THREE.Group;
    moonPositionNode: THREE.Group;
    moonMesh: THREE.Mesh;
    moonMaterial: THREE.MeshStandardMaterial;
    moonAxisLine: THREE.Group;
    moonFlagGroup: THREE.Group;
    earthOrbitLine: THREE.Line;
    moonOrbitLine: THREE.Line;
    tidalLockLine: THREE.Line;
    satellitesGroup: THREE.Group;
    satelliteObjects: { def: SatelliteDef; mesh: THREE.Group; orbitLine: THREE.Line }[];
    asteroidBelt: AsteroidBeltSystem;
    planetsList: PlanetObject[];
    prevTrackedPos: THREE.Vector3;
    isTransitioning: boolean;
    transitionProgress: number;
    camStartPos: THREE.Vector3;
    camEndPos: THREE.Vector3;
    targetStartPos: THREE.Vector3;
    targetEndPos: THREE.Vector3;
  } | null>(null);

  // Sincronizar estado mutable
  useEffect(() => {
    simStateRef.current.isPlaying = isPlaying;
    simStateRef.current.daysPerSecond = daysPerSecond;
    simStateRef.current.direction = direction;
    simStateRef.current.cameraMode = cameraMode;
    simStateRef.current.showLabels = showLabels;
    simStateRef.current.showOrbits = showOrbits;
    simStateRef.current.showTidalLine = showTidalLine;
    simStateRef.current.showShadowCones = showShadowCones;
    simStateRef.current.showCityLights = showCityLights;
    simStateRef.current.showAxes = showAxes;
    simStateRef.current.showPin = showPin;
    simStateRef.current.showSatellites = showSatellites;
    simStateRef.current.showAsteroids = showAsteroids;
    simStateRef.current.planetaryBoost = planetaryBoost;
    simStateRef.current.scientificScale = scientificScale;
    simStateRef.current.focusedPlanetId = focusedPlanetId;
    simStateRef.current.isInspectorOpen = isInspectorOpen;
    simStateRef.current.inspectedBodyKey = inspectedBodyKey;
    simStateRef.current.lat = customLat;
    simStateRef.current.lon = customLon;
  }, [
    isPlaying,
    daysPerSecond,
    direction,
    cameraMode,
    showLabels,
    showOrbits,
    showTidalLine,
    showShadowCones,
    showCityLights,
    showAxes,
    showPin,
    showSatellites,
    showAsteroids,
    planetaryBoost,
    scientificScale,
    focusedPlanetId,
    isInspectorOpen,
    inspectedBodyKey,
    customLat,
    customLon,
  ]);

  const handleFocusMoon = (planetId: string, moonDef: MoonDef) => {
    handleCameraSelect(planetId as CameraMode);
    setTimeout(() => {
      if (!threeRef.current) return;
      const { camera, controls } = threeRef.current;
      const pObj = planetId === 'earth' ? null : threeRef.current.planetsList?.find((p) => p.def.id === planetId);
      if (pObj) {
        const liveTarget = new THREE.Vector3();
        pObj.orbitNode.getWorldPosition(liveTarget);
        controls.target.copy(liveTarget);
        camera.position.set(
          liveTarget.x + moonDef.orbitRadius * 1.5,
          moonDef.orbitRadius * 0.8,
          liveTarget.z + moonDef.orbitRadius * 1.5
        );
        controls.update();
      }
    }, 350);
  };

  const applyLightMode = (isLight: boolean) => {
    setIsLightMode(isLight);
    simStateRef.current.isLightMode = isLight;
    audioEngine.playChime('click');
    if (!threeRef.current) return;
    const { scene, ambientLight, starfieldGroup, planetsList, earthOrbitLine, moonOrbitLine, tidalLockLine } = threeRef.current;
    if (isLight) {
      scene.background = new THREE.Color(0xf1f5f9);
      if (starfieldGroup) starfieldGroup.visible = false;
      ambientLight.intensity = 1.35;

      if (earthOrbitLine && earthOrbitLine.material) {
        (earthOrbitLine.material as THREE.LineBasicMaterial).color.setHex(0x334155);
        (earthOrbitLine.material as THREE.LineBasicMaterial).opacity = 0.65;
      }
      if (moonOrbitLine && moonOrbitLine.material) {
        (moonOrbitLine.material as THREE.LineBasicMaterial).color.setHex(0x334155);
        (moonOrbitLine.material as THREE.LineBasicMaterial).opacity = 0.65;
      }
      if (tidalLockLine && tidalLockLine.material) {
        (tidalLockLine.material as THREE.LineBasicMaterial).color.setHex(0x475569);
        (tidalLockLine.material as THREE.LineBasicMaterial).opacity = 0.65;
      }
      if (planetsList) {
        planetsList.forEach((p) => {
          if (p.orbitLine && p.orbitLine.material) {
            (p.orbitLine.material as THREE.LineBasicMaterial).color.setHex(0x334155);
            (p.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.65;
          }
          p.moons?.forEach((m) => {
            if (m.orbitLine && m.orbitLine.material) {
              (m.orbitLine.material as THREE.LineBasicMaterial).color.setHex(0x475569);
              (m.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.55;
            }
          });
        });
      }
    } else {
      scene.background = new THREE.Color(0x03060c);
      if (starfieldGroup) starfieldGroup.visible = true;
      ambientLight.intensity = planetaryBoost ? 0.32 : 0.04;

      if (earthOrbitLine && earthOrbitLine.material) {
        (earthOrbitLine.material as THREE.LineBasicMaterial).color.setHex(0x0284c7);
        (earthOrbitLine.material as THREE.LineBasicMaterial).opacity = 0.4;
      }
      if (moonOrbitLine && moonOrbitLine.material) {
        (moonOrbitLine.material as THREE.LineBasicMaterial).color.setHex(0x94a3b8);
        (moonOrbitLine.material as THREE.LineBasicMaterial).opacity = 0.4;
      }
      if (tidalLockLine && tidalLockLine.material) {
        (tidalLockLine.material as THREE.LineBasicMaterial).color.setHex(0x10b981);
        (tidalLockLine.material as THREE.LineBasicMaterial).opacity = 0.85;
      }
      if (planetsList) {
        planetsList.forEach((p) => {
          if (p.orbitLine && p.orbitLine.material) {
            (p.orbitLine.material as THREE.LineBasicMaterial).color.setHex(p.def.surfaceColorHex);
            (p.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.32;
          }
          p.moons?.forEach((m) => {
            if (m.orbitLine && m.orbitLine.material) {
              (m.orbitLine.material as THREE.LineBasicMaterial).color.setHex(0x94a3b8);
              (m.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.25;
            }
          });
        });
      }
    }
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#dropdown-triggers') && !target.closest('.dropdown-panel')) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, []);

  // ============================================================================
  // INICIALIZACIÓN THREE.JS, SHADERS Y ESCENA COMPLETA
  // ============================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.00008);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 25000);
    camera.position.set(0, 160, 320);
    camera.far = 25000;
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.maxDistance = 4000;
    controls.minDistance = 2.0;
    controls.target.set(0, 0, 0);
    controls.update();

    // PiP Renderer (Telescopio)
    let pipRenderer: THREE.WebGLRenderer | null = null;
    const pipCamera = new THREE.PerspectiveCamera(22, 1, 0.1, 1000);
    if (pipCanvasRef.current) {
      pipRenderer = new THREE.WebGLRenderer({
        canvas: pipCanvasRef.current,
        antialias: true,
        alpha: true,
      });
      pipRenderer.setSize(180, 180);
      pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    // Luces
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.35);
    scene.add(ambientLight);

    // Luz solar puntual sin decaimiento cuadrático para alcanzar planetas distantes
    const sunLight = new THREE.PointLight(0xfff8ee, 3.0, 0, 0);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = false;
    scene.add(sunLight);

    // Starfield de 8500 estrellas + Vía Láctea
    const starfieldGroup = createStarfield(scene);

    // Texturas Procedurales
    const proc = createProceduralTextures();

    // 1. SOL CON CORONA VOLUMÉTRICA
    const sunGeo = new THREE.SphereGeometry(SCALES.sunRadius, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({
      map: proc.sunTex,
      color: 0xffe8a3,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    // Corona y Bloom
    const coronaMat = new THREE.SpriteMaterial({
      map: createSunCoronaTexture(),
      color: 0xf59e0b,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunCoronaSprite = new THREE.Sprite(coronaMat);
    sunCoronaSprite.scale.setScalar(SCALES.sunRadius * 4.4);
    scene.add(sunCoronaSprite);

    // 2. TIERRA (MATERIALES NATIVOS 100% ESTABLES: Phong + Nubes + Halo)
    const earthOrbitNode = new THREE.Group();
    scene.add(earthOrbitNode);

    const earthTiltNode = new THREE.Group();
    earthTiltNode.rotation.x = ASTRO.EARTH_TILT_RAD;
    earthOrbitNode.add(earthTiltNode);

    // 1) Esfera base con MeshPhongMaterial: mapa diurno, bump, specular y luces nocturnas en emissiveMap
    const earthGeo = new THREE.SphereGeometry(SCALES.earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      map: proc.earthDayTex,
      bumpMap: proc.earthDayTex,
      bumpScale: 0.04,
      specularMap: proc.earthDayTex,
      specular: new THREE.Color(0x333333),
      shininess: 15,
      emissiveMap: proc.earthNightTex,
      emissive: new THREE.Color(0xffb84d),
      emissiveIntensity: 0.9,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMaterial);
    earthMesh.castShadow = false;
    earthMesh.receiveShadow = false;
    earthTiltNode.add(earthMesh);

    // 2) Esfera de nubes ligeramente mayor (scale: 1.01) con AdditiveBlending
    const cloudsGeo = new THREE.SphereGeometry(SCALES.earthRadius * 1.01, 48, 48);
    const earthCloudsMaterial = new THREE.MeshStandardMaterial({
      map: proc.earthCloudsTex,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const earthClouds = new THREE.Mesh(cloudsGeo, earthCloudsMaterial);
    earthTiltNode.add(earthClouds);

    // 3) Halo atmosférico con escala 1.03 y cara posterior (BackSide)
    const atmosGeo = new THREE.SphereGeometry(SCALES.earthRadius * 1.03, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const earthAtmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    earthTiltNode.add(earthAtmosphere);

    // Eje de rotación
    const earthAxisLine = createAxisIndicator(SCALES.earthRadius * 1.5, 0xfbbf24);
    earthTiltNode.add(earthAxisLine);

    // Pin Luminoso GPS con Anillo de Pulso Animado
    const { pinGroup: earthPinGroup, pulseMesh: pinPulseMesh } = createGpsPin();
    earthMesh.add(earthPinGroup);
    updatePinCoordinates(earthPinGroup, CITIES[0].lat, CITIES[0].lon);

    // Conos de Sombra (Umbra y Penumbra Terrestre)
    const earthUmbraCone = createShadowCone(SCALES.earthRadius, SCALES.earthRadius * 0.45, 50, 0x020617, 0.32);
    earthOrbitNode.add(earthUmbraCone);

    const earthPenumbraCone = createShadowCone(SCALES.earthRadius * 1.05, SCALES.earthRadius * 2.1, 50, 0x0f172a, 0.14);
    earthOrbitNode.add(earthPenumbraCone);

    // 3. LUNA (MATERIAL NATIVO MeshStandardMaterial SEGURO Y ESTABLE)
    const moonOrbitPlaneNode = new THREE.Group();
    moonOrbitPlaneNode.rotation.x = ASTRO.MOON_ORBIT_TILT_RAD;
    earthOrbitNode.add(moonOrbitPlaneNode);

    const moonPositionNode = new THREE.Group();
    moonOrbitPlaneNode.add(moonPositionNode);

    const moonGeo = new THREE.SphereGeometry(SCALES.moonRadius, 48, 48);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      map: proc.moonTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMaterial);
    moonMesh.castShadow = false;
    moonMesh.receiveShadow = false;
    moonPositionNode.add(moonMesh);

    // Cono de Sombra Lunar
    const moonUmbraCone = createShadowCone(SCALES.moonRadius, 0.12, 18, 0x020617, 0.35);
    moonPositionNode.add(moonUmbraCone);

    // Eje lunar y marcador de cara visible
    const moonAxisLine = createAxisIndicator(SCALES.moonRadius * 1.6, 0x34d399);
    moonMesh.add(moonAxisLine);

    const moonFlagGroup = createMoonNearSideMarker();
    moonMesh.add(moonFlagGroup);

    // Guías orbitales y vector de acoplamiento de marea
    const earthOrbitLine = createCircleLine(SCALES.earthOrbitRadius, 256, 0x0284c7, 0.4);
    scene.add(earthOrbitLine);

    const moonOrbitLine = createCircleLine(SCALES.moonOrbitRadius, 128, 0x94a3b8, 0.4);
    moonOrbitPlaneNode.add(moonOrbitLine);

    const tidalGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const tidalMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85 });
    const tidalLockLine = new THREE.Line(tidalGeo, tidalMat);
    moonOrbitPlaneNode.add(tidalLockLine);

    // Sistema de Satélites Artificiales en órbita ecuatorial/inclinada terrestre
    const { satellitesGroup, satelliteObjects } = createSatellitesSystem(earthTiltNode);

    // Cinturón de Asteroides 3D Real (2,500 asteroides en InstancedMesh)
    const asteroidBelt = createAsteroidBelt(scene);

    // Sistema Solar Completo: Planetas y sus respectivos satélites naturales
    const planetsList = createSolarSystemPlanets(scene, simStateRef.current.scientificScale);

    // Cargar texturas de alta resolución NASA con anisotropía máxima del renderer
    loadHighResTextures(earthMaterial, earthCloudsMaterial, moonMaterial, renderer.capabilities.getMaxAnisotropy());

    const prevTrackedPos = new THREE.Vector3();

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      pipCamera,
      pipRenderer,
      sunMesh,
      sunCoronaSprite,
      sunLight,
      ambientLight,
      starfieldGroup,
      earthOrbitNode,
      earthTiltNode,
      earthMesh,
      earthMaterial,
      earthClouds,
      earthCloudsMaterial,
      earthAtmosphere,
      earthAxisLine,
      earthPinGroup,
      pinPulseMesh,
      earthUmbraCone,
      earthPenumbraCone,
      moonUmbraCone,
      moonOrbitPlaneNode,
      moonPositionNode,
      moonMesh,
      moonMaterial,
      moonAxisLine,
      moonFlagGroup,
      earthOrbitLine,
      moonOrbitLine,
      tidalLockLine,
      satellitesGroup,
      satelliteObjects,
      asteroidBelt,
      planetsList,
      prevTrackedPos,
      isTransitioning: false,
      transitionProgress: 1.0,
      camStartPos: new THREE.Vector3(),
      camEndPos: new THREE.Vector3(),
      targetStartPos: new THREE.Vector3(),
      targetEndPos: new THREE.Vector3(),
    };

    // Redimensionamiento
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ========================================================================
    // BUCLE PRINCIPAL DE ANIMACIÓN CON CAMERA TARGET LOCK OBLIGATORIO
    // ========================================================================
    let animationFrameId: number;
    let lastFrameTime = performance.now();
    let throttleTimer = 0;
    let cloudsOffset = 0;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dtSeconds = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      const current = simStateRef.current;
      if (current.isPlaying) {
        current.simDays += dtSeconds * current.daysPerSecond * current.direction;
      }

      cloudsOffset += dtSeconds * 0.009;

      // Animación del pulso de radar en el Pin GPS
      const pulseScale = 1.0 + 0.35 * Math.sin(now * 0.006);
      pinPulseMesh.scale.setScalar(pulseScale);
      (pinPulseMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - (pulseScale - 1.0) * 2.2);

      const curDate = new Date(ASTRO.EPOCH_TIME + current.simDays * 86400000);

      // 1. Mecánica celeste (Tierra-Luna, Asteroides y Sistema Solar J2000 Kepleriano)
      updatePhysics(current.simDays, cloudsOffset, current.lat, current.lon);
      updateSolarSystemPhysics(planetsList, curDate, current.simDays, current.scientificScale);
      updateAsteroidBelt(asteroidBelt, current.simDays, current.showAsteroids, current.scientificScale);

      // 2. Sistema de Cámaras con Auto-Enfoque y Camera Tracking Riguroso
      updateCameraTracking(current.cameraMode, dtSeconds);

      // 3. Capas visuales
      earthOrbitLine.visible = current.showOrbits;
      moonOrbitLine.visible = current.showOrbits;
      planetsList.forEach((p) => {
        p.orbitLine.visible = current.showOrbits;
        p.moons.forEach((m) => {
          m.orbitLine.visible = current.showOrbits;
        });
      });
      tidalLockLine.visible = current.showTidalLine;
      moonFlagGroup.visible = current.showTidalLine;
      earthUmbraCone.visible = current.showShadowCones;
      earthPenumbraCone.visible = current.showShadowCones;
      moonUmbraCone.visible = current.showShadowCones;
      earthAxisLine.visible = current.showAxes;
      moonAxisLine.visible = current.showAxes;
      earthPinGroup.visible = current.showPin;
      satellitesGroup.visible = current.showSatellites;
      earthMaterial.emissiveIntensity = current.showCityLights ? 0.9 : 0.0;

      // 4. Telemetría y Detección de Eclipses
      throttleTimer += dtSeconds;
      if (throttleTimer > 0.035) {
        throttleTimer = 0;
        setSimDays(current.simDays);

        const solarStatus = checkSolarEclipse(current.simDays, current.lat, current.lon);
        const lunarStatus = checkLunarEclipse(current.simDays, current.lat, current.lon);
        setSolarEclipse(solarStatus);
        setLunarEclipse(lunarStatus);

        // Modelo de Eclipse Lunar ("Luna de Sangre") con materiales nativos estables
        if (lunarStatus.active) {
          const factor = lunarStatus.obscuration / 100;
          moonMaterial.color.setHex(0xb91c1c);
          moonMaterial.emissive.setHex(0x7f1d1d);
          moonMaterial.emissiveIntensity = factor * 0.75;
        } else {
          moonMaterial.color.setHex(0xe2e8f0);
          moonMaterial.emissive.setHex(0x000000);
          moonMaterial.emissiveIntensity = 0.0;
        }

        calcTelemetry(current.simDays, current.lat, current.lon);
        calcFloatingLabels(current.showLabels);

        // Telemetría en tiempo real del Inspector Planetario (únicamente cuando está abierto)
        if (current.isInspectorOpen && current.inspectedBodyKey) {
          const inspPlanet = PLANETS_CATALOGUE.find((p: PlanetDef) => p.id === current.inspectedBodyKey);
          if (inspPlanet) {
            const pData = computeHeliocentricPosition(inspPlanet, curDate, current.scientificScale);
            const rAU = pData.r_AU;
            const rMkm = rAU * 149.59787;
            let distEarthStr = '0.000 UA (0.0 M km)';
            if (inspPlanet.id !== 'earth') {
              const pObj = planetsList.find((p) => p.def.id === inspPlanet.id);
              if (pObj) {
                const pPos = new THREE.Vector3();
                pObj.orbitNode.getWorldPosition(pPos);
                const ePos = new THREE.Vector3();
                earthOrbitNode.getWorldPosition(ePos);
                const dUnits = pPos.distanceTo(ePos);
                const earthR_units = getScaledOrbitRadius(1.0, current.scientificScale);
                const distAU = dUnits / earthR_units;
                const distMkm = distAU * 149.59787;
                distEarthStr = `${distAU.toFixed(3)} UA (${distMkm.toFixed(1)} M km)`;
              }
            }
            setInspectorTelemetry({
              distSun: `${rAU.toFixed(3)} UA (${rMkm.toFixed(1)} M km)`,
              distEarth: distEarthStr,
              speed: `${pData.v_kms.toFixed(2)} km/s`,
            });
          }
        }
      }

      // Control dinámico de Realce Lumínico Planetario y Modo Claro
      if (current.isLightMode) {
        ambientLight.intensity = 1.35;
      } else {
        ambientLight.intensity = current.planetaryBoost ? 0.32 : 0.04;
      }
      if (planetsList) {
        planetsList.forEach((p) => {
          if (['jupiter', 'saturn', 'uranus', 'neptune'].includes(p.def.id)) {
            p.planetMesh.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat && mat.emissive) {
                  if (current.planetaryBoost) {
                    mat.emissive.setHex(p.def.surfaceColorHex).multiplyScalar(0.09);
                  } else {
                    mat.emissive.setHex(0x000000);
                  }
                }
              }
            });
          }
        });
      }

      // Render Principal
      renderer.render(scene, camera);

      // Render Telescópico PiP con resolución dinámica según el contenedor (Ultra HD al maximizarse)
      if (pipRenderer && pipCanvasRef.current) {
        const rect = pipCanvasRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const dpr = Math.min(window.devicePixelRatio, 2);
          const targetW = Math.round(rect.width * dpr);
          const targetH = Math.round(rect.height * dpr);
          if (pipCanvasRef.current.width !== targetW || pipCanvasRef.current.height !== targetH) {
            pipRenderer.setSize(rect.width, rect.height, false);
            pipCamera.aspect = rect.width / rect.height;
            pipCamera.updateProjectionMatrix();
          }
        }
        const moonPos = new THREE.Vector3();
        moonMesh.getWorldPosition(moonPos);
        pipCamera.lookAt(moonPos);
        pipCamera.updateMatrixWorld();

        pipRenderer.render(scene, pipCamera);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (pipRenderer) pipRenderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ============================================================================
  // MECÁNICA CELESTE, TRASLACIONES Y ORIENTACIÓN DE CONOS
  // ============================================================================
  const updatePhysics = (d: number, cOffset: number, lat: number, lon: number) => {
    if (!threeRef.current) return;
    const {
      earthOrbitNode,
      earthMesh,
      earthClouds,
      earthMaterial,
      moonPositionNode,
      moonMesh,
      moonMaterial,
      tidalLockLine,
      earthUmbraCone,
      earthPenumbraCone,
      moonUmbraCone,
      earthPinGroup,
      pipCamera,
    } = threeRef.current;

    // 1. Traslación Terrestre alrededor del Sol con Efemérides J2000 Keplerianas
    const simDate = new Date(ASTRO.EPOCH_TIME + d * 86400000);
    const { pos: earthHeliocentricPos } = computeHeliocentricPosition(
      EARTH_EPHEMERIS,
      simDate,
      simStateRef.current.scientificScale
    );
    const earthX = earthHeliocentricPos.x;
    const earthZ = earthHeliocentricPos.z;
    earthOrbitNode.position.set(earthX, earthHeliocentricPos.y, earthZ);

    // Vector unitario y ángulo hacia el Sol en el plano orbital XZ
    const sunAngle = Math.atan2(-earthZ, -earthX);

    // 2. Rotación Diurna Terrestre a partir de la hora UTC exacta
    // A las 12:00 UTC, el meridiano de Greenwich (lon = 0°) apunta exactamente al Sol (sunAngle)
    const utcHours = simDate.getUTCHours() + simDate.getUTCMinutes() / 60 + simDate.getUTCSeconds() / 3600 + simDate.getUTCMilliseconds() / 3600000;
    const utcFraction = (utcHours - 12.0) / 24.0;
    const earthSpinAngle = sunAngle + utcFraction * Math.PI * 2;
    earthMesh.rotation.y = earthSpinAngle;
    if (earthClouds) {
      earthClouds.rotation.y = earthSpinAngle + cOffset;
    }

    // 3. Traslación Lunar
    const moonOrbitAngle = (d / ASTRO.MOON_SIDEREAL_DAYS) * Math.PI * 2;
    const moonLocalX = Math.cos(moonOrbitAngle) * SCALES.moonOrbitRadius;
    const moonLocalZ = -Math.sin(moonOrbitAngle) * SCALES.moonOrbitRadius;
    moonPositionNode.position.set(moonLocalX, 0, moonLocalZ);

    // 4. Acoplamiento de Marea 1:1
    moonMesh.rotation.y = moonOrbitAngle;

    // Vector de Marea
    const pos = (tidalLockLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    pos[0] = 0; pos[1] = 0; pos[2] = 0;
    pos[3] = moonLocalX; pos[4] = 0; pos[5] = moonLocalZ;
    tidalLockLine.geometry.attributes.position.needsUpdate = true;

    // 5. Orientación de los Conos de Sombra (opuestos al Sol)
    const antiSunDir = new THREE.Vector3(earthX, 0, earthZ).normalize();
    earthUmbraCone.position.copy(antiSunDir).multiplyScalar(25);
    earthUmbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), antiSunDir);

    earthPenumbraCone.position.copy(antiSunDir).multiplyScalar(25);
    earthPenumbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), antiSunDir);

    // Cono lunar
    const moonWorld = new THREE.Vector3();
    moonPositionNode.getWorldPosition(moonWorld);
    const antiSunMoon = moonWorld.clone().normalize();
    moonUmbraCone.position.set(0, 0, 0).addScaledVector(antiSunMoon, 9);
    moonUmbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), antiSunMoon);

    // 6. Actualizar Pin GPS según el mapeo equirectangular exacto
    updatePinCoordinates(earthPinGroup, lat, lon);

    // 8. Cámara telescópica PiP (mirando a la Luna desde la Tierra)
    pipCamera.position.set(earthX, SCALES.earthRadius * 1.2, earthZ);
    pipCamera.lookAt(moonWorld);
    pipCamera.updateMatrixWorld();

    // 9. Cinemática orbital de satélites artificiales (vis-viva & Kepler)
    if (threeRef.current?.satelliteObjects) {
      updateSatellitesPhysics(threeRef.current.satelliteObjects, d);
    }
  };

  const updatePinCoordinates = (pinGroup: THREE.Group, lat: number, lon: number) => {
    // Mapeo UV Three.js SphereGeometry:
    // u = 0.5 es Greenwich (lon = 0°), u = (lon + 180)/360
    // phi = (lon + 180) * PI / 180
    // theta = (90 - lat) * PI / 180 (0 en Polo Norte, PI/2 en Ecuador, PI en Polo Sur)
    const phi = (lon + 180) * (Math.PI / 180);
    const theta = (90 - lat) * (Math.PI / 180);
    const r = SCALES.earthRadius * 1.006;

    const x = -r * Math.cos(phi) * Math.sin(theta);
    const y = r * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);

    pinGroup.position.set(x, y, z);
    const normal = new THREE.Vector3(x, y, z).normalize();
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  };

  // ============================================================================
  // SISTEMA DE CÁMARAS CON AUTO-ENFOQUE DINÁMICO Y SEGUIMIENTO (CAMERA LOCK)
  // ============================================================================
  const handleCameraSelect = (mode: CameraMode) => {
    setCameraMode(mode);
    simStateRef.current.cameraMode = mode;
    audioEngine.playChime('click');

    // Abrir automáticamente el Inspector Planetario si es un planeta
    if (mode === 'earth' || PLANETS_CATALOGUE.some((p) => p.id === mode)) {
      setIsInspectorOpen(true);
      setInspectedBodyKey(mode);
      setFocusedPlanetId(mode);
    }

    if (!threeRef.current) return;
    const { camera, controls } = threeRef.current;

    // Registrar posición y objetivo de origen para la transición cinematográfica
    threeRef.current.camStartPos.copy(camera.position);
    threeRef.current.targetStartPos.copy(controls.target);

    // Activar controles orbitales para navegación libre tras llegar, salvo en vista telescópica fija
    controls.enabled = mode !== 'earth_to_moon';

    // Iniciar vuelo de transición cinematográfica
    threeRef.current.isTransitioning = true;
    threeRef.current.transitionProgress = 0.0;
  };

  /**
   * Suavizado cinematográfico de alto orden (Ken Perlin Smootherstep):
   * Derivadas de velocidad y aceleración continuas en t=0 y t=1 (C^2 continuity).
   * Elimina cualquier sacudida mecánica o frenado brusco.
   */
  const cinematicSmootherstep = (t: number): number => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  const updateCameraTracking = (mode: CameraMode, dt: number) => {
    if (!threeRef.current) return;
    const {
      camera,
      controls,
      earthOrbitNode,
      moonPositionNode,
      earthPinGroup,
      prevTrackedPos,
    } = threeRef.current;

    // 1. Manejo de transición cinematográfica prolongada y fluida
    if (threeRef.current.isTransitioning) {
      // Duración cinematográfica prolongada (~2.2 segundos para una navegación majestuosa y cósmica)
      const CINEMATIC_DURATION = 2.2;
      threeRef.current.transitionProgress += dt / CINEMATIC_DURATION;
      const progress = Math.min(1.0, threeRef.current.transitionProgress);

      // Curva de Easing Cinematográfica de alto orden
      const smoothT = cinematicSmootherstep(progress);

      // Calcular posiciones dinámicas del destino en tiempo real para cuerpos en órbita continua
      const liveTarget = new THREE.Vector3();
      const liveCamEnd = new THREE.Vector3();

      if (mode === 'system') {
        liveTarget.set(0, 0, 0);
        liveCamEnd.set(0, SCALES.earthOrbitRadius * 1.15, SCALES.earthOrbitRadius * 1.85);
      } else if (mode === 'earth') {
        earthOrbitNode.getWorldPosition(liveTarget);
        liveCamEnd.set(
          liveTarget.x + SCALES.moonOrbitRadius * 1.6,
          SCALES.moonOrbitRadius * 0.9,
          liveTarget.z + SCALES.moonOrbitRadius * 1.6
        );
      } else if (mode === 'moon') {
        moonPositionNode.getWorldPosition(liveTarget);
        liveCamEnd.set(
          liveTarget.x + SCALES.moonRadius * 5.2,
          SCALES.moonRadius * 3.0,
          liveTarget.z + SCALES.moonRadius * 5.2
        );
      } else if (mode === 'earth_to_moon') {
        const earthPos = new THREE.Vector3();
        earthOrbitNode.getWorldPosition(earthPos);
        moonPositionNode.getWorldPosition(liveTarget);
        const dirToMoon = new THREE.Vector3().subVectors(liveTarget, earthPos).normalize();
        liveCamEnd
          .copy(earthPos)
          .addScaledVector(dirToMoon, SCALES.earthRadius * 1.35)
          .add(new THREE.Vector3(0, SCALES.earthRadius * 0.5, 0));
      } else {
        const pObj = threeRef.current.planetsList?.find((p) => p.def.id === mode);
        if (pObj) {
          pObj.orbitNode.getWorldPosition(liveTarget);
          const viewDist = pObj.def.radius * (pObj.def.hasRings ? 6.5 : 4.8);
          liveCamEnd.set(
            liveTarget.x + viewDist * 1.1,
            viewDist * 0.55,
            liveTarget.z + viewDist * 1.1
          );
        }
      }

      // Arco parabólico de elevación orbital cinematográfica (vuelo espacial en arco, evitando cortes lineales secos)
      const arcProgress = Math.sin(smoothT * Math.PI);
      const flightDistance = threeRef.current.camStartPos.distanceTo(liveCamEnd);
      const arcElevation = arcProgress * Math.min(22.0, Math.max(2.0, flightDistance * 0.15));

      // Interpolación suave y orgánica
      controls.target.lerpVectors(threeRef.current.targetStartPos, liveTarget, smoothT);
      camera.position.lerpVectors(threeRef.current.camStartPos, liveCamEnd, smoothT);
      camera.position.y += arcElevation;

      if (mode === 'earth_to_moon') {
        camera.lookAt(liveTarget);
      } else {
        controls.update();
      }

      // Finalización de la transición: acople suave sin saltos al sistema de seguimiento orbital
      if (progress >= 1.0) {
        threeRef.current.isTransitioning = false;
        threeRef.current.prevTrackedPos.copy(liveTarget);
        if (mode === 'earth_to_moon') {
          controls.enabled = false;
        } else {
          controls.enabled = true;
        }
      }
      return;
    }

    // 2. Modos especiales fijos
    if (mode === 'earth_to_moon') {
      const earthPos = new THREE.Vector3();
      const moonPos = new THREE.Vector3();
      earthOrbitNode.getWorldPosition(earthPos);
      moonPositionNode.getWorldPosition(moonPos);

      const dirToMoon = new THREE.Vector3().subVectors(moonPos, earthPos).normalize();
      camera.position
        .copy(earthPos)
        .addScaledVector(dirToMoon, SCALES.earthRadius * 1.35)
        .add(new THREE.Vector3(0, SCALES.earthRadius * 0.5, 0));
      camera.lookAt(moonPos);
      return;
    }

    // 3. Modos con Target Lock Orbital estricto (Delta Vector Addition)
    const currentTargetWorld = new THREE.Vector3();

    if (mode === 'earth') {
      earthOrbitNode.getWorldPosition(currentTargetWorld);
    } else if (mode === 'moon') {
      moonPositionNode.getWorldPosition(currentTargetWorld);
    } else if (threeRef.current.planetsList?.some((p) => p.def.id === mode)) {
      const pObj = threeRef.current.planetsList.find((p) => p.def.id === mode);
      pObj?.orbitNode.getWorldPosition(currentTargetWorld);
    } else {
      // Modo 'system' orbita alrededor del centro (0, 0, 0)
      controls.update();
      return;
    }

    // Sumar el delta del movimiento orbital tanto a la cámara como al target
    const delta = new THREE.Vector3().subVectors(currentTargetWorld, prevTrackedPos);
    camera.position.add(delta);
    controls.target.add(delta);
    prevTrackedPos.copy(currentTargetWorld);
    controls.update();
  };

  // ============================================================================
  // GEOLOCALIZACIÓN NAVEGADOR (GPS ACTUAL)
  // ============================================================================
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocalización no soportada por tu navegador.');
      return;
    }
    setGpsLoading(true);
    setGpsMessage(null);
    audioEngine.playChime('click');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCustomLat(lat);
        setCustomLon(lon);
        setSelectedCity({
          name: 'Mi Ubicación GPS',
          country: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
          lat,
          lon,
        });
        setGpsLoading(false);
        setGpsMessage(`¡Coordenadas GPS sincronizadas: [${lat.toFixed(2)}°, ${lon.toFixed(2)}°]!`);
        setTimeout(() => setGpsMessage(null), 4000);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMessage('Permiso GPS denegado. Puedes ingresar tus coordenadas manualmente.');
        } else {
          setGpsMessage('No se pudo obtener la ubicación GPS.');
        }
        setTimeout(() => setGpsMessage(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCitySelect = (city: CityLocation) => {
    setSelectedCity(city);
    setCustomLat(city.lat);
    setCustomLon(city.lon);
    audioEngine.playChime('click');
  };

  // ============================================================================
  // TELEMETRÍA, FASES Y DETECCIÓN DE ECLIPSES
  // ============================================================================
  const calcTelemetry = (d: number, lat: number, lon: number) => {
    const years = d / ASTRO.DAYS_PER_YEAR;
    const dayInYear = ((d % ASTRO.DAYS_PER_YEAR) + ASTRO.DAYS_PER_YEAR) % ASTRO.DAYS_PER_YEAR;
    const orbitPct = (dayInYear / ASTRO.DAYS_PER_YEAR) * 100;
    const moonSidereal = d / ASTRO.MOON_SIDEREAL_DAYS;

    let season = 'Primavera (HN)';
    if (orbitPct < 25) season = 'Primavera (HN)';
    else if (orbitPct < 50) season = 'Verano (HN)';
    else if (orbitPct < 75) season = 'Otoño (HN)';
    else season = 'Invierno (HN)';

    // Fase Lunar
    const earthAngle = (d / ASTRO.DAYS_PER_YEAR) * Math.PI * 2;
    const moonAngle = (d / ASTRO.MOON_SIDEREAL_DAYS) * Math.PI * 2;
    const phaseFrac = (((moonAngle - earthAngle + Math.PI) / (Math.PI * 2)) % 1 + 1) % 1;
    const illumPct = Math.round(((1 - Math.cos(phaseFrac * Math.PI * 2)) / 2) * 100);
    const moonAgeDays = phaseFrac * ASTRO.MOON_SYNODIC_DAYS;

    let phaseName = '🌑 Luna Nueva';
    if (phaseFrac < 0.03 || phaseFrac > 0.97) phaseName = '🌑 Luna Nueva';
    else if (phaseFrac < 0.22) phaseName = '🌒 Creciente Cóncava';
    else if (phaseFrac < 0.28) phaseName = '🌓 Cuarto Creciente';
    else if (phaseFrac < 0.47) phaseName = '🌔 Gibosa Creciente';
    else if (phaseFrac < 0.53) phaseName = '🌕 Luna Llena';
    else if (phaseFrac < 0.72) phaseName = '🌖 Gibosa Menguante';
    else if (phaseFrac < 0.78) phaseName = '🌗 Cuarto Menguante';
    else phaseName = '🌘 Menguante Cóncava';

    // Iluminación diurna/nocturna en el Pin GPS con margen de crepúsculo
    let isDay = true;
    if (threeRef.current) {
      const pinWorld = new THREE.Vector3();
      threeRef.current.earthPinGroup.getWorldPosition(pinWorld);
      const earthWorld = new THREE.Vector3();
      threeRef.current.earthOrbitNode.getWorldPosition(earthWorld);
      const pinWorldNormal = new THREE.Vector3().subVectors(pinWorld, earthWorld).normalize();
      const earthToSunVector = new THREE.Vector3(-earthWorld.x, -earthWorld.y, -earthWorld.z).normalize();
      isDay = pinWorldNormal.dot(earthToSunVector) > -0.05;
    }

    setTelemetry({
      earthRotations: d.toFixed(2),
      earthOrbits: years.toFixed(3),
      orbitPct: orbitPct.toFixed(1),
      season,
      moonOrbits: moonSidereal.toFixed(3),
      moonRotations: moonSidereal.toFixed(3),
      moonPhaseName: phaseName,
      moonIllum: `${illumPct}%`,
      moonAge: moonAgeDays.toFixed(1),
      moonPhaseFrac: phaseFrac,
      isLocalDaytime: isDay,
    });
  };

  const calcFloatingLabels = (isVisible: boolean) => {
    if (!threeRef.current || !containerRef.current || !isVisible) {
      setLabelsPos({
        sun: { x: 0, y: 0, visible: false },
        earth: { x: 0, y: 0, visible: false },
        moon: { x: 0, y: 0, visible: false },
        pin: { x: 0, y: 0, visible: false },
      });
      return;
    }

    const { camera, sunMesh, earthOrbitNode, moonPositionNode, earthPinGroup } = threeRef.current;
    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const project = (obj: THREE.Object3D, yOff: number) => {
      const pos = new THREE.Vector3();
      obj.getWorldPosition(pos);
      pos.y += yOff;
      const proj = pos.project(camera);
      if (proj.z > 1) return { x: 0, y: 0, visible: false };
      return {
        x: (proj.x * 0.5 + 0.5) * width,
        y: (-(proj.y * 0.5) + 0.5) * height,
        visible: true,
      };
    };

    // 1. Nivel de Detalle (LOD): Calcular distancia de la cámara a la Tierra
    const earthWorldPos = new THREE.Vector3();
    earthOrbitNode.getWorldPosition(earthWorldPos);
    const distToEarth = camera.position.distanceTo(earthWorldPos);

    // Ocultar etiqueta del Pin GPS si la cámara está lejos (> 40) o en vista sistema general
    const isPinLODVisible = distToEarth <= 40 && simStateRef.current.cameraMode !== 'system';

    const sun = project(sunMesh, SCALES.sunRadius + 1.5);
    const earth = project(earthOrbitNode, SCALES.earthRadius + 1.2);
    const moon = project(moonPositionNode, SCALES.moonRadius + 0.9);
    const pin = isPinLODVisible ? project(earthPinGroup, 0.65) : { x: 0, y: 0, visible: false };

    // 2. Anti-colisión en 2D de pantalla (Regla 3b: distY < 28px y distX < 110px -> desplazar)
    const activeLabels: { key: string; x: number; y: number; visible: boolean }[] = [
      { key: 'sun', ...sun },
      { key: 'earth', ...earth },
      { key: 'moon', ...moon },
      { key: 'pin', ...pin },
    ];

    if (threeRef.current?.planetsList) {
      threeRef.current.planetsList.forEach((p) => {
        const proj = project(p.orbitNode, p.def.radius + 1.2);
        activeLabels.push({ key: p.def.id, ...proj });
      });
    }

    for (let i = 0; i < activeLabels.length; i++) {
      if (!activeLabels[i].visible) continue;
      for (let j = i + 1; j < activeLabels.length; j++) {
        if (!activeLabels[j].visible) continue;
        const dx = Math.abs(activeLabels[i].x - activeLabels[j].x);
        const dy = Math.abs(activeLabels[i].y - activeLabels[j].y);
        if (dx < 110 && dy < 28) {
          const shift = (28 - dy) + 6;
          if (activeLabels[j].y >= activeLabels[i].y) {
            activeLabels[j].y += shift;
          } else {
            activeLabels[j].y -= shift;
          }
        }
      }
    }

    const resultMap: Record<string, { x: number; y: number; visible: boolean }> = {};
    activeLabels.forEach((l) => {
      resultMap[l.key] = { x: l.x, y: l.y, visible: l.visible };
    });

    const fallbackPos = { x: 0, y: 0, visible: false };
    setLabelsPos({
      sun: resultMap.sun || fallbackPos,
      earth: resultMap.earth || fallbackPos,
      moon: resultMap.moon || fallbackPos,
      pin: resultMap.pin || fallbackPos,
      mercury: resultMap.mercury || fallbackPos,
      venus: resultMap.venus || fallbackPos,
      mars: resultMap.mars || fallbackPos,
      jupiter: resultMap.jupiter || fallbackPos,
      saturn: resultMap.saturn || fallbackPos,
      uranus: resultMap.uranus || fallbackPos,
      neptune: resultMap.neptune || fallbackPos,
      pluto: resultMap.pluto || fallbackPos,
    });
  };

  // ============================================================================
  // BUSCADOR DE EVENTOS ("VIAJE EN EL TIEMPO")
  // ============================================================================
  const jumpToSolarEclipse = () => {
    const day = findNextSolarEclipse(simDays);
    if (day !== null) {
      simStateRef.current.simDays = day;
      setSimDays(day);
      setDaysPerSecond(0.0416667); // 1 hora / seg para observar
      audioEngine.playChime('solar');
      setDismissedAlert(null);
      handleCameraSelect('earth');
    }
  };

  const jumpToLunarEclipse = () => {
    const day = findNextLunarEclipse(simDays);
    if (day !== null) {
      simStateRef.current.simDays = day;
      setSimDays(day);
      setDaysPerSecond(0.0416667);
      audioEngine.playChime('lunar');
      setDismissedAlert(null);
      handleCameraSelect('moon');
    }
  };

  const jumpToPhase = (targetPhase: number) => {
    const synodicFrac = (simDays % ASTRO.MOON_SYNODIC_DAYS) / ASTRO.MOON_SYNODIC_DAYS;
    let diff = targetPhase - synodicFrac;
    if (diff <= 0.01) diff += 1.0;
    const nextDays = simDays + diff * ASTRO.MOON_SYNODIC_DAYS;
    simStateRef.current.simDays = nextDays;
    setSimDays(nextDays);
    audioEngine.playChime('click');
  };

  const jumpToRealTimeNow = () => {
    const now = Date.now();
    const daysSinceEpoch = (now - ASTRO.EPOCH_TIME) / 86400000;
    simStateRef.current.simDays = daysSinceEpoch;
    setSimDays(daysSinceEpoch);
    setDaysPerSecond(0.000011574);
    setIsPlaying(true);
    audioEngine.playChime('click');
  };

  const handleStepTime = (deltaDays: number) => {
    const next = simStateRef.current.simDays + deltaDays;
    simStateRef.current.simDays = next;
    setSimDays(next);
    audioEngine.playChime('click');
  };

  const openAdvancedCalendar = () => {
    setCalYear(currentSimDate.getUTCFullYear());
    setCalMonth(currentSimDate.getUTCMonth() + 1);
    setCalDay(currentSimDate.getUTCDate());
    setCalHour(currentSimDate.getUTCHours());
    setCalMinute(currentSimDate.getUTCMinutes());
    setIsAdvancedCalendarOpen(true);
    audioEngine.playChime('click');
  };

  const handleApplyCustomDate = (year: number, month: number, day: number, hour: number, minute: number) => {
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.max(1, Math.min(day, maxDay));
    const targetUtcMs = Date.UTC(year, month - 1, validDay, hour, minute, 0);
    const targetDays = (targetUtcMs - ASTRO.EPOCH_TIME) / 86400000;
    simStateRef.current.simDays = targetDays;
    setSimDays(targetDays);
    setIsPlaying(false);
    setIsAdvancedCalendarOpen(false);
    audioEngine.playChime('click');
  };

  const handleSelectHistoricalEvent = (event: HistoricalEvent) => {
    setActiveHistoricalEventCard(event);
    setSelectedHistoricalEvent(event);
    const targetUtcMs = new Date(event.dateUtcIso).getTime();
    const targetDays = (targetUtcMs - ASTRO.EPOCH_TIME) / 86400000;
    simStateRef.current.simDays = targetDays;
    setSimDays(targetDays);
    setIsPlaying(false);

    if (event.lat !== undefined && event.lon !== undefined) {
      setCustomLat(event.lat);
      setCustomLon(event.lon);
      setSelectedCity({
        name: event.locationName.split('(')[0].trim(),
        country: 'Ubicación Histórica',
        lat: event.lat,
        lon: event.lon,
      });
    }

    if (event.recommendedCamera) {
      handleCameraSelect(event.recommendedCamera);
    }

    setIsAdvancedCalendarOpen(false);
    audioEngine.playChime(event.category.includes('eclipse') ? 'solar' : 'click');
  };

  const handleSetSpeed = (speed: number) => {
    setDaysPerSecond(speed);
    simStateRef.current.daysPerSecond = speed;
    audioEngine.playChime('click');
  };

  return (
    <div className={`relative flex flex-col h-screen w-screen overflow-hidden select-none font-sans ${isLightMode ? 'light-mode bg-slate-100 text-slate-900' : 'bg-[#030712] text-slate-100'}`}>
      {/* ==================================================================== */}
      {/* 0. PANTALLA DE BIENVENIDA ("SPLASH SCREEN") CINEMATOGRÁFICA 3 SEGUNDOS */}
      {/* ==================================================================== */}
      {showSplashScreen && (
        <div
          className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-800 pointer-events-none select-none ${
            splashFade ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transitionDuration: '800ms' }}
        >
          {/* Canvas de Partículas Estelares y Siluetas Planetarias */}
          <canvas ref={splashCanvasRef} className="absolute inset-0 w-full h-full block" />

          {/* Textos Cinematográficos Centrados */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-xl animate-fade-in">
            {/* Pequeño isotipo o anillo cósmico */}
            <div className="w-16 h-16 mb-4 rounded-full border border-sky-400/40 bg-sky-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.35)]">
              <span className="text-3xl select-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">🪐</span>
            </div>

            {/* Título Principal */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight sm:tracking-wide font-sans mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]">
              El sistema solar
            </h1>

            {/* Subtítulo */}
            <p className="text-sm sm:text-base md:text-lg font-medium text-slate-400 tracking-wider font-mono-num uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              por <span className="text-slate-200 font-semibold tracking-normal normal-case">Robert Pacheco</span>
            </p>

            {/* Barra de progreso de carga sutil de 3 segundos */}
            <div className="w-48 sm:w-64 h-0.5 bg-slate-800 rounded-full mt-8 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-400 to-amber-300 w-full origin-left animate-[scaleX_3s_ease-out_forwards]" />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. HUD FLOTANTE SUPERIOR ("DOBLE PÍLDORA INTELIGENTE" APPLE-STYLE) */}
      {/* ==================================================================== */}
      <header
        className={`fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 w-[96vw] max-w-[96vw] flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-none ${
          isZenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* PÍLDORA 1: ESTADO ASTRONÓMICO COMPACTO CON ICONOS */}
        <div className="space-panel top-hud-pill1 pointer-events-auto rounded-full px-2 sm:px-3 h-8 sm:h-9 flex items-center justify-between gap-1.5 sm:gap-2.5 shadow-xl border border-sky-500/30 whitespace-nowrap text-[11px] sm:text-xs">
          {/* Botón Play / Pausa (fijo 30px x 30px) */}
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              audioEngine.playChime('click');
            }}
            className="w-[30px] h-[30px] min-w-[30px] max-w-[30px] rounded-full bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-slate-950 flex items-center justify-center transition cursor-pointer shrink-0"
            title={isPlaying ? 'Pausar simulación' : 'Reanudar simulación'}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-xs`}></i>
          </button>

          <span className="text-slate-700 shrink-0 select-none">|</span>

          {/* 1. SECCIÓN FECHA/HORA COMPACTA */}
          <div
            onClick={openAdvancedCalendar}
            className="flex items-center gap-1 text-[11px] sm:text-xs font-mono-num text-slate-200 whitespace-nowrap overflow-hidden shrink-0 cursor-pointer hover:text-sky-300 transition"
            title="Abrir Calendario Universal y Eventos del Siglo XX"
          >
            <i className="fa-regular fa-calendar text-sky-400 text-[10px] sm:text-[11px] shrink-0"></i>
            <span className="whitespace-nowrap font-medium">
              {currentSimDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '')}
            </span>
            <span className="text-slate-500 shrink-0">•</span>
            <span className="text-sky-300 whitespace-nowrap font-semibold">
              {currentSimDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <span className="text-slate-700 shrink-0 select-none">|</span>

          {/* 2. SECCIÓN FASE LUNAR (ICONO + %) */}
          <div
            className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 whitespace-nowrap shrink-0 cursor-pointer hover:text-white"
            onClick={() => setOpenDropdown(openDropdown === 'menu-time' ? null : 'menu-time')}
            title={`Fase Lunar: ${telemetry.moonPhaseName} (${telemetry.moonIllum})`}
          >
            <span>{telemetry.moonPhaseName.split(' ')[0] || '🌘'}</span>
            <span className="text-amber-300 font-mono-num font-semibold text-[10px] sm:text-xs">{telemetry.moonIllum}</span>
          </div>

          <span className="text-slate-700 shrink-0 select-none">|</span>

          {/* 3. SECCIÓN ESTADO DE ECLIPSE (COMPACTO) */}
          <div className="flex items-center justify-center whitespace-nowrap shrink-0">
            {solarEclipse.active ? (
              <div
                onClick={() => handleCameraSelect('earth')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse cursor-pointer"
                title="Eclipse Solar Activo - Toca para enfocar la Tierra"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-ping"></span>
                <span className="font-bold">🌑 {solarEclipse.obscuration}%</span>
              </div>
            ) : lunarEclipse.active ? (
              <div
                onClick={() => handleCameraSelect('moon')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/60 text-rose-300 text-[10px] sm:text-xs shadow-[0_0_10px_rgba(225,29,72,0.3)] animate-pulse cursor-pointer"
                title="Eclipse Lunar (Luna de Sangre) - Toca para enfocar la Luna"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
                <span className="font-bold">🩸 {lunarEclipse.obscuration}%</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium select-none px-1 py-0.5"
                title="Sin eclipse activo en esta fecha"
              >
                <span>🔭</span>
                <span className="hidden sm:inline">Sin eclipse</span>
                <span className="sm:hidden">—</span>
              </div>
            )}
          </div>
        </div>

        {/* PÍLDORA 2: HERRAMIENTAS RÁPIDAS 100% BASADA EN ICONOS */}
        <div className="space-panel top-hud-pill2 pointer-events-auto rounded-full px-2 sm:px-2.5 h-8 sm:h-9 flex items-center justify-center gap-1.5 sm:gap-2 shadow-xl border border-sky-500/30 whitespace-nowrap text-xs">
          {/* 1. MODO CLARO / OSCURO */}
          <button
            onClick={() => applyLightMode(!isLightMode)}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              isLightMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title={isLightMode ? 'Cambiar a Modo Oscuro' : 'Modo Claro (Espacio Blanco)'}
          >
            <i className={`fa-solid ${isLightMode ? 'fa-sun text-amber-500' : 'fa-moon text-sky-300'} text-xs`}></i>
          </button>

          {/* 2. ETIQUETAS 3D ON/OFF */}
          <button
            onClick={() => {
              setShowLabels(!showLabels);
              audioEngine.playChime('click');
            }}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              showLabels
                ? 'bg-indigo-500/35 text-indigo-200 border border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title={showLabels ? 'Ocultar Etiquetas 3D' : 'Mostrar Etiquetas 3D'}
          >
            <i className="fa-solid fa-tags text-xs"></i>
          </button>

          {/* 3. ÓRBITAS PLANETARIAS ON/OFF */}
          <button
            onClick={() => {
              setShowOrbits(!showOrbits);
              audioEngine.playChime('click');
            }}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              showOrbits
                ? 'bg-sky-500/30 text-sky-200 border border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title={showOrbits ? 'Ocultar Órbitas' : 'Mostrar Órbitas'}
          >
            <i className="fa-solid fa-circle-notch text-xs"></i>
          </button>

          {/* 4. TELESCOPIO PIP LUNA */}
          <button
            onClick={() => {
              setIsPipOpen(!isPipOpen);
              audioEngine.playChime('click');
            }}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              isPipOpen
                ? 'bg-cyan-500/35 text-cyan-200 border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title="Telescopio PiP (Luna)"
          >
            <i className="fa-solid fa-eye text-xs"></i>
          </button>

          {/* 5. REALCE LUMÍNICO PLANETARIO */}
          <button
            onClick={() => {
              const nextVal = !planetaryBoost;
              setPlanetaryBoost(nextVal);
              simStateRef.current.planetaryBoost = nextVal;
              audioEngine.playChime('click');
            }}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              planetaryBoost
                ? 'bg-amber-500/30 text-amber-300 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title={planetaryBoost ? 'Desactivar Realce Lumínico Planetario' : 'Activar Realce Lumínico Planetario'}
          >
            <i className="fa-solid fa-lightbulb text-xs"></i>
          </button>

          {/* 6. AUDIO ESPACIAL ON/OFF */}
          <button
            onClick={() => {
              const active = audioEngine.toggle();
              setIsAudioActive(active);
            }}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              isAudioActive
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
            }`}
            title={isAudioActive ? 'Silenciar Audio' : 'Activar Audio Espacial'}
          >
            <i className={`fa-solid ${isAudioActive ? 'fa-volume-high' : 'fa-volume-xmark'} text-xs`}></i>
          </button>

          {/* 7. MODO ZEN / PANTALLA LIMPIA */}
          <button
            onClick={() => {
              setIsZenMode(true);
              audioEngine.playChime('click');
            }}
            className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer border border-slate-700/80 shrink-0"
            title="Modo Zen (100% Pantalla Limpia)"
          >
            <i className="fa-solid fa-expand text-xs"></i>
          </button>
        </div>
      </header>

      {/* Salir de Modo Zen */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-full space-panel text-xs text-sky-300 border border-sky-500/40 hover:bg-sky-500/20 transition flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          <i className="fa-solid fa-compress"></i> <span>Salir de Modo Zen</span>
        </button>
      )}

      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* 3. DOCK INFERIOR CENTRADO (MENÚS DESPLEGABLES CON EXCLUSIÓN MUTUA) */}
      {/* ==================================================================== */}
      <nav
        id="dropdown-triggers"
        className={`fixed bottom-3 sm:bottom-6 bottom-dock-bar left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-2xl space-panel border border-sky-500/30 shadow-[0_16px_45px_rgba(0,0,0,0.85)] transition-all duration-300 max-w-[96vw] ${
          isZenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* MENÚ 1: TIEMPO Y EVENTOS */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'menu-time' ? null : 'menu-time')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium space-panel border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              openDropdown === 'menu-time' ? 'btn-active' : 'border-slate-800 text-slate-200'
            }`}
            title="Efemérides, tiempo y velocidad"
          >
            <i className="fa-solid fa-clock text-sky-400"></i>
            <span className="hidden min-[380px]:inline">Tiempo</span>
          </button>

          {openDropdown === 'menu-time' && (
            <div id="menu-time" className="dropdown-panel dropdown-menu menu-panel panel-desplegable open max-md:fixed max-md:bottom-[70px] max-md:left-1/2 max-md:-translate-x-1/2 max-md:w-[92vw] max-md:max-w-[380px] max-md:max-h-[calc(100dvh-140px)] max-md:overflow-y-auto max-md:rounded-[16px] max-md:p-[12px_14px] max-md:z-[150] md:absolute md:bottom-full md:mb-3 md:left-0 sm:md:left-1/2 sm:md:-translate-x-1/2 md:w-84 sm:md:w-96 space-panel md:rounded-2xl md:p-3 z-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-hourglass-half"></i> Tiempo y Calendario
                </span>
                <button
                  onClick={jumpToRealTimeNow}
                  className="text-[10px] bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-slate-950 px-2 py-0.5 rounded border border-sky-500/40 transition cursor-pointer"
                  title="Sincronizar con la hora real UTC actual"
                >
                  <i className="fa-solid fa-bolt mr-1"></i>Ahora
                </button>
              </div>

              {/* Selector de Fecha */}
              <div className="mb-3">
                <label className="text-[11px] text-slate-400 block mb-1">Fecha Simulada:</label>
                <input
                  type="date"
                  value={currentSimDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value + 'T12:00:00Z').getTime();
                    const nextDays = (newDate - ASTRO.EPOCH_TIME) / 86400000;
                    simStateRef.current.simDays = nextDays;
                    setSimDays(nextDays);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-mono-num cursor-pointer"
                />
              </div>

              {/* Línea de Tiempo Deslizable */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Progreso Anual:</span>
                  <span className="font-mono-num font-bold text-sky-300">
                    Día {(simDays % 365.25).toFixed(1)} / 365.25 d
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="365.25"
                  step="0.05"
                  value={(simDays % 365.25 + 365.25) % 365.25}
                  onChange={(e) => {
                    const fullYears = Math.floor(simDays / 365.25);
                    const nextDays = fullYears * 365.25 + parseFloat(e.target.value);
                    simStateRef.current.simDays = nextDays;
                    setSimDays(nextDays);
                  }}
                  className="w-full"
                />
              </div>

              {/* Botón Destacado: Calendario Universal y Eventos del Siglo XX */}
              <button
                onClick={() => {
                  openAdvancedCalendar();
                  setOpenDropdown(null);
                }}
                className="w-full mb-3 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500/25 via-indigo-500/25 to-purple-500/25 hover:from-sky-500/35 hover:via-indigo-500/35 hover:to-purple-500/35 text-sky-200 border border-sky-400/50 text-xs font-semibold flex items-center justify-between shadow-lg shadow-sky-950/40 cursor-pointer transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/30 border border-sky-400/50 flex items-center justify-center text-sky-300 shrink-0">
                    <i className="fa-solid fa-calendar-days text-xs"></i>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-100 text-[11px] leading-tight">Calendario Universal & S. XX</div>
                    <div className="text-[10px] text-sky-300 font-normal leading-tight">Fecha arbitraria o eclipses históricos</div>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-sky-400 shrink-0"></i>
              </button>

              {/* Controles de Reproducción y Dirección */}
              <div className="flex items-center justify-between gap-1.5 mb-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-[3] py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 cursor-pointer"
                >
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                  <span>{isPlaying ? 'Pausar Simulación' : 'Reanudar Simulación'}</span>
                </button>
                <button
                  onClick={() => setDirection((d) => d * -1)}
                  className={`px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    direction < 0 ? 'btn-active text-amber-300 border-amber-400' : ''
                  }`}
                  title="Invertir dirección del tiempo"
                >
                  <i className="fa-solid fa-arrow-right-arrow-left"></i>
                  <span className="text-[10px] font-mono-num">{direction > 0 ? '+Fwd' : '-Rev'}</span>
                </button>
              </div>

              {/* Botones de Paso Fino (Avance y Retroceso de Alta Precisión) */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 mb-1.5 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-arrows-left-right text-sky-400"></i> Paso Fino Astronómico:
                  </span>
                  <span className="text-[10px] text-slate-500">Paso a paso</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleStepTime(-1.0)}
                    className="py-1.5 px-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium transition cursor-pointer text-center active:scale-95"
                    title="Retroceder exactamente 1 día"
                  >
                    -1 Día
                  </button>
                  <button
                    onClick={() => handleStepTime(-1.0 / 24)}
                    className="py-1.5 px-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium transition cursor-pointer text-center active:scale-95"
                    title="Retroceder exactamente 1 hora"
                  >
                    -1 Hora
                  </button>
                  <button
                    onClick={() => handleStepTime(1.0 / 24)}
                    className="py-1.5 px-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium transition cursor-pointer text-center active:scale-95"
                    title="Avanzar exactamente 1 hora"
                  >
                    +1 Hora
                  </button>
                  <button
                    onClick={() => handleStepTime(1.0)}
                    className="py-1.5 px-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-medium transition cursor-pointer text-center active:scale-95"
                    title="Avanzar exactamente 1 día"
                  >
                    +1 Día
                  </button>
                </div>
              </div>

              {/* Control Continuo de Velocidad (Slider) */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]">
                    <i className="fa-solid fa-gauge-high text-amber-400"></i> Velocidad:
                  </span>
                  <span className="font-mono-num font-bold text-sky-300 text-[11px] bg-sky-950/70 border border-sky-500/30 px-2 py-0.5 rounded-md">
                    {daysPerSecond < 0.0001
                      ? 'Tiempo Real (1x)'
                      : Math.abs(daysPerSecond - 1 / 24) < 0.005
                      ? '1 Hora / seg'
                      : Math.abs(daysPerSecond - 0.25) < 0.01
                      ? '6 Horas / seg'
                      : Math.abs(daysPerSecond - 1.0) < 0.02
                      ? '1 Día / seg'
                      : Math.abs(daysPerSecond - 7.0) < 0.1
                      ? '1 Semana / seg'
                      : Math.abs(daysPerSecond - 30.0) < 0.5
                      ? '1 Mes / seg'
                      : daysPerSecond < 1
                      ? `${(daysPerSecond * 24).toFixed(1)} h / seg`
                      : daysPerSecond < 14
                      ? `${daysPerSecond.toFixed(1)} d / seg`
                      : `${(daysPerSecond / 30).toFixed(1)} mes / seg`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-4.94"
                  max="1.48"
                  step="0.04"
                  value={Math.log10(Math.max(0.000011574, daysPerSecond))}
                  onChange={(e) => {
                    const spd = Math.pow(10, parseFloat(e.target.value));
                    handleSetSpeed(spd);
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />

                {/* Botonera de Velocidades Predeterminadas */}
                <div className="mt-2.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">
                    Velocidades predeterminadas:
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {[
                      { label: 'Tiempo Real (1x)', value: 0.000011574 },
                      { label: '1 Hora/s', value: 1 / 24 },
                      { label: '6 Horas/s', value: 0.25 },
                      { label: '1 Día/s', value: 1.0 },
                      { label: '1 Semana/s', value: 7.0 },
                      { label: '1 Mes/s', value: 30.0 },
                    ].map((preset) => {
                      const isActive =
                        preset.value < 0.001
                          ? daysPerSecond < 0.001
                          : Math.abs(daysPerSecond - preset.value) / preset.value < 0.08;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => handleSetSpeed(preset.value)}
                          className={`py-1.5 px-1.5 rounded-lg border text-center transition font-medium cursor-pointer truncate ${
                            isActive
                              ? 'btn-active border-sky-400 bg-sky-500/25 text-sky-200 font-bold shadow-sm shadow-sky-500/20'
                              : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                          }`}
                          title={`Fijar velocidad a ${preset.label}`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Viaje en el Tiempo (Eventos de 1 Clic) */}
              <div className="border-t border-slate-800 pt-2.5">
                <div className="text-[11px] text-slate-400 mb-1.5 font-bold flex items-center gap-1">
                  <i className="fa-solid fa-wand-magic-sparkles text-amber-400"></i> Viaje en el Tiempo a Eventos:
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <button
                    onClick={jumpToSolarEclipse}
                    className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-sun text-amber-400"></i> Próx. Eclipse Solar
                  </button>
                  <button
                    onClick={jumpToLunarEclipse}
                    className="py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-moon text-rose-400"></i> Próx. Eclipse Lunar
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <button
                    onClick={() => jumpToPhase(0.0)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center cursor-pointer"
                  >
                    🌑 Nueva
                  </button>
                  <button
                    onClick={() => jumpToPhase(0.25)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center cursor-pointer"
                  >
                    🌓 Creciente
                  </button>
                  <button
                    onClick={() => jumpToPhase(0.5)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center cursor-pointer"
                  >
                    🌕 Llena
                  </button>
                  <button
                    onClick={() => jumpToPhase(0.75)}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center cursor-pointer"
                  >
                    🌗 Menguante
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MENÚ 2: CÁMARAS Y GPS */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'menu-cameras' ? null : 'menu-cameras')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium space-panel border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              openDropdown === 'menu-cameras' ? 'btn-active' : 'border-slate-800 text-slate-200'
            }`}
            title="Cámaras de seguimiento y observación"
          >
            <i className="fa-solid fa-video text-amber-400"></i>
            <span className="hidden min-[380px]:inline">Cámaras</span>
          </button>

          {openDropdown === 'menu-cameras' && (
            <div id="menu-cameras" className="dropdown-panel dropdown-menu menu-panel panel-desplegable open max-md:fixed max-md:bottom-[70px] max-md:left-1/2 max-md:-translate-x-1/2 max-md:w-[92vw] max-md:max-w-[380px] max-md:max-h-[calc(100dvh-140px)] max-md:overflow-y-auto max-md:rounded-[16px] max-md:p-[12px_14px] max-md:z-[150] md:absolute md:bottom-full md:mb-3 md:left-1/2 md:-translate-x-1/2 md:w-84 space-panel md:rounded-2xl md:p-3 z-50 shadow-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-700/70 pb-2 mb-2">
                Cámaras Espaciales (Target Lock)
              </div>

              <div className="space-y-1.5 mb-3">
                {[
                  { id: 'system', icon: 'fa-globe text-amber-400', label: 'Vista del Sistema', desc: 'Enfoque Sol' },
                  { id: 'earth', icon: 'fa-earth-americas text-sky-400', label: 'Seguir la Tierra', desc: 'Auto-enfoque' },
                  { id: 'moon', icon: 'fa-moon text-slate-300', label: 'Seguir la Luna', desc: 'Acoplamiento 1:1' },
                  { id: 'earth_to_moon', icon: 'fa-eye text-emerald-400', label: 'Órbitas Tierra → Luna', desc: 'Fases' },
                ].map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => handleCameraSelect(cam.id as CameraMode)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center justify-between cursor-pointer ${
                      cameraMode === cam.id ? 'btn-active' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <i className={`fa-solid ${cam.icon} w-4`}></i> {cam.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{cam.desc}</span>
                  </button>
                ))}
              </div>

              {/* Navegación 3D por los Planetas y sus Satélites */}
              <div className="border-t border-slate-800 pt-2.5 mb-3">
                <div className="text-[11px] text-sky-400 mb-1.5 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-ring"></i> Planetas y Satélites:
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-enfoque</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLANETS_CATALOGUE.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleCameraSelect(p.id as CameraMode)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-medium border transition flex items-center justify-between cursor-pointer ${
                        cameraMode === p.id
                          ? 'btn-active border-sky-400 font-bold'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                      }`}
                      title={`Volar hacia ${p.name} y sus ${p.totalKnownMoons} satélites`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: `#${p.surfaceColorHex.toString(16).padStart(6, '0')}` }}
                        ></span>
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono shrink-0">
                        {p.totalKnownMoons > 0 ? `${p.totalKnownMoons} lunas` : '0 lunas'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón Destacado: Usar mi Ubicación Actual GPS */}
              <div className="border-t border-slate-800 pt-2.5">
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 mb-2"
                >
                  <i className={`fa-solid ${gpsLoading ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`}></i>
                  <span>🎯 Usar mi ubicación actual (GPS)</span>
                </button>

                {gpsMessage && (
                  <div className="text-[10px] p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 mb-2 text-center">
                    {gpsMessage}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 mb-1.5 font-bold">Ciudades Rápidas (Pin 3D):</div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {CITIES.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleCitySelect(c)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] border text-left truncate transition cursor-pointer ${
                        selectedCity.name === c.name
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {/* Campos Lat/Lon manuales */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-500 block">Latitud (°)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customLat}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomLat(val);
                        setSelectedCity({ name: 'Personalizado', country: 'GPS', lat: val, lon: customLon });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-sky-300 font-mono-num"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-500 block">Longitud (°)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customLon}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomLon(val);
                        setSelectedCity({ name: 'Personalizado', country: 'GPS', lat: customLat, lon: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-sky-300 font-mono-num"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MENÚ 3: CAPAS */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'menu-layers' ? null : 'menu-layers')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium space-panel border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              openDropdown === 'menu-layers' ? 'btn-active' : 'border-slate-800 text-slate-200'
            }`}
            title="Capas y elementos visuales 3D"
          >
            <i className="fa-solid fa-layer-group text-indigo-400"></i>
            <span className="hidden min-[380px]:inline">Capas</span>
          </button>

          {openDropdown === 'menu-layers' && (
            <div id="menu-layers" className="dropdown-panel dropdown-menu menu-panel panel-desplegable open max-md:fixed max-md:bottom-[70px] max-md:left-1/2 max-md:-translate-x-1/2 max-md:w-[92vw] max-md:max-w-[380px] max-md:max-h-[calc(100dvh-140px)] max-md:overflow-y-auto max-md:rounded-[16px] max-md:p-[12px_14px] max-md:z-[150] md:absolute md:bottom-full md:mb-3 md:right-0 sm:md:left-1/2 sm:md:-translate-x-1/2 md:w-68 space-panel md:rounded-2xl md:p-3 z-50 text-xs shadow-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 border-b border-slate-700/70 pb-2 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-sliders"></i> Elementos Visuales 3D
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Interruptor Modo Claro */}
                <label className="flex items-center justify-between cursor-pointer py-1 border-b border-slate-700/50 pb-1.5 mb-1 hover:text-amber-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <i className={`fa-solid ${isLightMode ? 'fa-sun text-amber-400' : 'fa-moon text-sky-400'}`}></i>
                    <span>Modo Claro (Espacio Blanco)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isLightMode}
                    onChange={(e) => applyLightMode(e.target.checked)}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-1 hover:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-lightbulb text-amber-400"></i> Realce Lumínico Planetario
                  </span>
                  <input
                    type="checkbox"
                    checked={planetaryBoost}
                    onChange={(e) => {
                      setPlanetaryBoost(e.target.checked);
                      simStateRef.current.planetaryBoost = e.target.checked;
                      audioEngine.playChime('click');
                    }}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-sky-300">
                  <span>Órbitas Planetarias</span>
                  <input
                    type="checkbox"
                    checked={showOrbits}
                    onChange={(e) => setShowOrbits(e.target.checked)}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-indigo-300">
                  <span>Conos de Sombra (Umbra)</span>
                  <input
                    type="checkbox"
                    checked={showShadowCones}
                    onChange={(e) => setShowShadowCones(e.target.checked)}
                    className="accent-indigo-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-emerald-300">
                  <span>Vector Marea (Cara Fija)</span>
                  <input
                    type="checkbox"
                    checked={showTidalLine}
                    onChange={(e) => setShowTidalLine(e.target.checked)}
                    className="accent-emerald-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-amber-300">
                  <span>Luces Nocturnas de Ciudades</span>
                  <input
                    type="checkbox"
                    checked={showCityLights}
                    onChange={(e) => setShowCityLights(e.target.checked)}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-rose-300">
                  <span>Pin GPS {selectedCity.name.split(',')[0]}</span>
                  <input
                    type="checkbox"
                    checked={showPin}
                    onChange={(e) => setShowPin(e.target.checked)}
                    className="accent-rose-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-yellow-300">
                  <span>Ejes de Rotación</span>
                  <input
                    type="checkbox"
                    checked={showAxes}
                    onChange={(e) => setShowAxes(e.target.checked)}
                    className="accent-yellow-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-sky-300">
                  <span>Etiquetas Flotantes</span>
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-cyan-300">
                  <span>Satélites Artificiales (LEO/GEO)</span>
                  <input
                    type="checkbox"
                    checked={showSatellites}
                    onChange={(e) => {
                      setShowSatellites(e.target.checked);
                      audioEngine.playChime('click');
                    }}
                    className="accent-cyan-400 cursor-pointer"
                  />

                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-meteor text-amber-400"></i> Cinturón de Asteroides (2,500)
                  </span>
                  <input
                    type="checkbox"
                    checked={showAsteroids}
                    onChange={(e) => {
                      setShowAsteroids(e.target.checked);
                      simStateRef.current.showAsteroids = e.target.checked;
                      audioEngine.playChime('click');
                    }}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-ruler-combined text-sky-400"></i> Escala Científica
                  </span>
                  <input
                    type="checkbox"
                    checked={scientificScale}
                    onChange={(e) => {
                      setScientificScale(e.target.checked);
                      simStateRef.current.scientificScale = e.target.checked;
                      if (threeRef.current) {
                        updateAllOrbitLineGeometries(threeRef.current.planetsList, e.target.checked);
                      }
                      audioEngine.playChime('click');
                    }}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-sky-300">
                  <span>Telescopio PiP (Luna)</span>
                  <input
                    type="checkbox"
                    checked={isPipOpen}
                    onChange={(e) => {
                      setIsPipOpen(e.target.checked);
                      audioEngine.playChime('click');
                    }}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>

                {/* Botón PWA: Instalar App en Android */}
                <button
                  onClick={() => {
                    const promptEvent = (window as unknown as { deferredInstallPrompt?: { prompt: () => void; userChoice: Promise<{ outcome: string }> } }).deferredInstallPrompt;
                    if (promptEvent) {
                      promptEvent.prompt();
                    } else {
                      alert('Para instalar en Android:\nToca el menú de tres puntos (⋮) de Chrome y selecciona "Agregar a la pantalla principal" o "Instalar aplicación".');
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <i className="fa-solid fa-mobile-screen-button"></i>
                  <span>📲 Instalar App (Android / PWA)</span>
                </button>

                {/* Botón para volver a ver el tutorial interactivo */}
                <button
                  onClick={() => {
                    setShowTutorial(true);
                    setTutorialStep(0);
                    setOpenDropdown(null);
                    audioEngine.playChime('click');
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 cursor-pointer"
                >
                  <i className="fa-solid fa-graduation-cap text-sky-200"></i>
                  <span>✨ Ver Tutorial / Guía Rápida</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* 4. TELESCOPIO PICTURE-IN-PICTURE (PiP) */}
      {/* ==================================================================== */}
      <div
        className={`transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isPipMaximized
            ? 'fixed bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 w-[min(72vh,620px)] h-[min(76vh,660px)] z-[90] shadow-[0_25px_70px_rgba(0,0,0,0.85)]'
            : 'fixed bottom-6 right-6 w-[200px] h-[230px] z-40'
        }`}
        style={{
          visibility: isPipOpen && !isZenMode ? 'visible' : 'hidden',
          opacity: isPipOpen && !isZenMode ? 1 : 0,
          pointerEvents: isPipOpen && !isZenMode ? 'auto' : 'none',
        }}
      >
        <div className="w-full h-full space-panel rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-sky-500/40 flex flex-col items-center">
          {/* Cabecera del Telescopio PiP */}
          <div className="w-full flex items-center justify-between mb-1.5 px-1 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <i className="fa-solid fa-telescope text-sky-400"></i>
              <span>Telescopio (PiP)</span>
              {isPipMaximized && (
                <span className="text-[9px] px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded border border-sky-400/30 font-mono-num font-semibold">
                  HD
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {/* Botón Maximizar / Restaurar (⤢ / ⤡) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPipMaximized((m) => !m);
                  audioEngine.playChime('click');
                }}
                className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-sky-500/30 text-slate-300 hover:text-sky-200 border border-slate-700/60 flex items-center justify-center text-xs transition cursor-pointer"
                title={isPipMaximized ? 'Restaurar tamaño normal (⤡)' : 'Maximizar telescopio a pantalla completa HD (⤢)'}
              >
                <span className="text-sm font-bold leading-none select-none">{isPipMaximized ? '⤡' : '⤢'}</span>
              </button>
              {/* Botón Cerrar X */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPipOpen(false);
                  audioEngine.playChime('click');
                }}
                className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 border border-slate-700/60 flex items-center justify-center text-xs transition cursor-pointer"
                title="Cerrar telescopio"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Visor Circular de la Luna (Clicable para alternar entre modo normal y maximizado HD) */}
          <div
            onClick={() => {
              setIsPipMaximized((m) => !m);
              audioEngine.playChime('click');
            }}
            className="relative rounded-full overflow-hidden border-2 border-sky-400/60 shadow-inner bg-slate-950 cursor-pointer group flex-1 max-h-[calc(100%-48px)] aspect-square flex items-center justify-center transition-transform hover:scale-[1.01]"
            title="Haz clic para alternar entre vista compacta y maximizada HD"
          >
            <canvas ref={pipCanvasRef} className="w-full h-full block rounded-full"></canvas>
            {/* Retícula telescópica */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-[1px] bg-sky-500/25"></div>
              <div className="h-full w-[1px] bg-sky-500/25 absolute"></div>
              <div className="w-1/3 h-1/3 rounded-full border border-sky-500/30 absolute"></div>
              <div className="w-2/3 h-2/3 rounded-full border border-sky-500/15 absolute"></div>
            </div>
            {/* Indicador interactivo en hover */}
            <div className="absolute bottom-2.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-sky-500/40 text-[9px] text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 shadow-lg">
              <span>{isPipMaximized ? '⤡ Clic para restaurar' : '⤢ Clic para maximizar HD'}</span>
            </div>
          </div>

          {/* Pie de ventana PiP con fase lunar sincronizada */}
          <div className="text-[10px] text-slate-400 mt-1 font-mono-num shrink-0 flex items-center gap-1.5">
            <span>Luna desde la Tierra</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300">{telemetry.moonIllum}</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. LIENZO 3D WEBGL (100% PANTALLA) */}
      {/* ==================================================================== */}
      <main
        className="relative flex-1 w-full h-full overflow-hidden touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (openDropdown) setOpenDropdown(null);
          // Raycaster para detectar clics sobre las esferas planetarias en 3D
          if (threeRef.current && containerRef.current && (e.target as HTMLElement).tagName === 'CANVAS') {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), threeRef.current.camera);

            const interactiveObjects: THREE.Object3D[] = [threeRef.current.earthMesh];
            threeRef.current.planetsList.forEach((p) => {
              if (p.planetMesh) interactiveObjects.push(p.planetMesh);
            });

            const intersects = raycaster.intersectObjects(interactiveObjects, true);
            if (intersects.length > 0) {
              let hit: THREE.Object3D | null = intersects[0].object;
              let hitId = hit === threeRef.current.earthMesh ? 'earth' : hit.userData?.planetId;
              while (hit && !hitId && hit.parent) {
                hit = hit.parent;
                if (hit.userData?.planetId) hitId = hit.userData.planetId;
              }
              if (hitId) {
                setIsInspectorOpen(true);
                setInspectedBodyKey(hitId);
                setFocusedPlanetId(hitId);
                handleCameraSelect(hitId as CameraMode);
              }
            }
          }
        }}
      >
        <div
          id="canvas-container"
          ref={containerRef}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 1,
            display: 'block',
            touchAction: 'none',
          }}
        />

        {/* ETIQUETAS FLOTANTES 3D (LIMPIAS Y COMPACTAS) */}
        {showLabels && !isZenMode && (
          <div id="labels-container" className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {labelsPos.sun.visible && (
              <div
                className="planet-label border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                style={{ left: `${labelsPos.sun.x}px`, top: `${labelsPos.sun.y}px` }}
              >
                <i className="fa-solid fa-sun mr-1 text-amber-400"></i>Sol
              </div>
            )}
            {labelsPos.earth.visible && (
              <div
                className="planet-label border-sky-500/60 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer pointer-events-auto hover:scale-105"
                style={{ left: `${labelsPos.earth.x}px`, top: `${labelsPos.earth.y}px` }}
                onClick={() => {
                  setIsInspectorOpen(true);
                  setInspectedBodyKey('earth');
                  setFocusedPlanetId('earth');
                  handleCameraSelect('earth');
                }}
              >
                <i className="fa-solid fa-earth-americas mr-1 text-sky-400"></i>🌍 Tierra (23.44°)
              </div>
            )}
            {labelsPos.moon.visible && (
              <div
                className={`planet-label transition-colors duration-300 cursor-pointer pointer-events-auto hover:scale-105 ${
                  lunarEclipse.active
                    ? 'border-rose-500 text-rose-300 bg-rose-950/90 shadow-[0_0_18px_rgba(225,29,72,0.5)]'
                    : 'border-slate-400/50 text-slate-200'
                }`}
                style={{ left: `${labelsPos.moon.x}px`, top: `${labelsPos.moon.y}px` }}
                onClick={() => handleCameraSelect('moon')}
              >
                <i className={`fa-solid fa-moon mr-1 ${lunarEclipse.active ? 'text-rose-400' : 'text-slate-300'}`}></i>
                {lunarEclipse.active ? 'Luna (Luna de Sangre)' : 'Luna (1:1 Síncrona)'}
              </div>
            )}
            {showPin && labelsPos.pin.visible && (
              <div
                className="planet-label border-amber-400/80 text-amber-300 text-[10px] bg-slate-950/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                style={{ left: `${labelsPos.pin.x}px`, top: `${labelsPos.pin.y}px` }}
              >
                <i className="fa-solid fa-location-dot mr-1 text-amber-400"></i>
                {selectedCity.name}
              </div>
            )}
            {PLANETS_CATALOGUE.map((p) => {
              const pos = labelsPos[p.id];
              if (!pos || !pos.visible) return null;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setIsInspectorOpen(true);
                    setInspectedBodyKey(p.id);
                    setFocusedPlanetId(p.id);
                    handleCameraSelect(p.id as CameraMode);
                  }}
                  className="planet-label transition-all cursor-pointer pointer-events-auto hover:scale-105"
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    borderColor: `#${p.surfaceColorHex.toString(16).padStart(6, '0')}aa`,
                    color: '#f8fafc',
                    boxShadow: `0 0 14px #${p.surfaceColorHex.toString(16).padStart(6, '0')}44`,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: `#${p.surfaceColorHex.toString(16).padStart(6, '0')}` }}
                  ></span>
                  <span>{p.icon} {p.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* TARJETA LATERAL HOLOGRÁFICA "INSPECTOR PLANETARIO" (APPLE DESIGN) */}
        {focusedPlanet && isInspectorOpen && !isZenMode && (
          <aside
            id="planet-inspector"
            style={{ pointerEvents: 'auto', zIndex: 120 }}
            className="fixed top-18 right-6 z-[120] w-80 max-w-[calc(100vw-3rem)] space-panel rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-sky-500/30 backdrop-blur-2xl transition-all duration-300 max-h-[82vh] overflow-y-auto pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <span className="text-3xl filter drop-shadow">{focusedPlanet.icon}</span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    {focusedPlanet.name}
                    {focusedPlanet.hasRings && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                        Anillos
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-sky-400 font-medium">{focusedPlanet.type}</span>
                </div>
              </div>
              <button
                id="btn-close-inspector"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInspectorOpen(false);
                  setInspectedBodyKey(null);
                  setFocusedPlanetId(null);
                }}
                style={{ cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 130 }}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 border border-slate-700/60 flex items-center justify-center text-xs transition cursor-pointer"
                title="Cerrar inspector"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Telemetría Live */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-sun text-amber-400"></i> Dist. al Sol:
                </span>
                <span className="font-mono-num font-bold text-sky-300">
                  {inspectorTelemetry.distSun || `${focusedPlanet.a_AU.toFixed(3)} UA`}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-earth-americas text-sky-400"></i> Dist. a la Tierra:
                </span>
                <span className="font-mono-num font-bold text-sky-300">
                  {inspectorTelemetry.distEarth || 'Calculando...'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-gauge text-emerald-400"></i> Velocidad Orbital:
                </span>
                <span className="font-mono-num font-bold text-emerald-300">
                  {inspectorTelemetry.speed || '29.8 km/s'}
                </span>
              </div>
            </div>

            {/* Características Físicas */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Día (Rotación)</div>
                <div className="font-bold text-slate-200 mt-0.5">
                  {Math.abs(focusedPlanet.rot_period_hours).toFixed(1)} h{' '}
                  {focusedPlanet.rot_period_hours < 0 ? '(Retrógrada)' : ''}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Año (Periodo)</div>
                <div className="font-bold text-slate-200 mt-0.5">
                  {(focusedPlanet.period_days / 365.25).toFixed(2)} a ({focusedPlanet.period_days.toFixed(0)} d)
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Inclinación Axial</div>
                <div className="font-bold text-slate-200 mt-0.5">{focusedPlanet.tilt_deg.toFixed(2)}°</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Temp. Media</div>
                <div className="font-bold text-slate-200 mt-0.5">{focusedPlanet.temp_c} °C</div>
              </div>
            </div>

            {/* Satélites Naturales */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-moon"></i> Satélites Naturales:
                </span>
                <span className="text-[10px] sm:text-[11px] text-amber-300 font-mono-num font-bold">
                  {formatMoonsHeader(focusedPlanet.totalKnownMoons, focusedPlanet.moons?.length || 0, focusedPlanet.id)}
                </span>
              </div>
              {focusedPlanet.moons && focusedPlanet.moons.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {focusedPlanet.moons.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => handleFocusMoon(focusedPlanet.id, m)}
                      className="px-2 py-1.5 rounded-lg bg-slate-900/80 hover:bg-sky-500/25 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center justify-between"
                      title={`Enfocar satélite ${m.name}`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: `#${m.colorHex.toString(16).padStart(6, '0')}` }}
                        ></span>
                        <span className="truncate">{m.name}</span>
                      </span>
                      <i className="fa-solid fa-crosshairs text-[9px] text-slate-500"></i>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic py-0.5">
                  No posee satélites naturales conocidos.
                </div>
              )}
            </div>

            {/* Botón de Enfoque Principal */}
            <button
              onClick={() => handleCameraSelect(focusedPlanet.id as CameraMode)}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <i className="fa-solid fa-video"></i>
              <span>Volar hacia {focusedPlanet.name}</span>
            </button>
          </aside>
        )}

        {/* ==================================================================== */}
        {/* 5. MODAL DE CALENDARIO AVANZADO Y EVENTOS HISTÓRICOS (APPLE DESIGN) */}
        {/* ==================================================================== */}
        {isAdvancedCalendarOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
            onClick={() => setIsAdvancedCalendarOpen(false)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[92vh] flex flex-col space-panel rounded-3xl border border-sky-500/40 shadow-2xl overflow-hidden text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-md">
                    <i className="fa-solid fa-calendar-days text-base"></i>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Calendario Universal y Efemérides Históricas</span>
                      <span className="text-[10px] py-0.5 px-2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-normal">
                        Mecánica J2000
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configura cualquier fecha arbitraria en el pasado/futuro o viaja a eventos históricos del Siglo XX
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAdvancedCalendarOpen(false);
                    audioEngine.playChime('click');
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Cerrar calendario"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Pestañas de Navegación */}
              <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/40">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCalendarTab('events');
                      audioEngine.playChime('click');
                    }}
                    className={`py-1.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                      calendarTab === 'events'
                        ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <i className="fa-solid fa-sparkles text-amber-400"></i>
                    <span>Catálogo de Eventos Históricos</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {HISTORICAL_EVENTS.length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setCalendarTab('picker');
                      audioEngine.playChime('click');
                    }}
                    className={`py-1.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                      calendarTab === 'picker'
                        ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 shadow-sm shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <i className="fa-solid fa-sliders text-sky-400"></i>
                    <span>Selector Universal (Año, Mes, Día, Hora)</span>
                  </button>
                </div>

                {/* Botón rápido para volver al presente */}
                <button
                  onClick={() => {
                    jumpToRealTimeNow();
                    setIsAdvancedCalendarOpen(false);
                  }}
                  className="hidden sm:flex items-center gap-1.5 text-xs text-sky-300 hover:text-sky-200 font-medium py-1 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition cursor-pointer"
                  title="Sincronizar con la hora real de tu reloj"
                >
                  <i className="fa-solid fa-clock-rotate-left text-[11px]"></i>
                  <span>Tiempo Real (Hoy)</span>
                </button>
              </div>

              {/* Contenido del Tab */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {calendarTab === 'events' ? (
                  /* TAB 1: CATÁLOGO DE EVENTOS HISTÓRICOS */
                  <div className="space-y-4">
                    {/* Filtro de Categorías */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      {[
                        { id: 'all', label: 'Todos los Eventos' },
                        { id: 'eclipse_20th', label: 'Eclipses del Siglo XX (1900-1999)' },
                        { id: 'eclipse_modern', label: 'Eclipses Siglo XXI y Futuros' },
                        { id: 'space_milestone', label: 'Hitos Espaciales' },
                        { id: 'historical_astronomy', label: 'Astronomía Clásica' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedEventCategory(cat.id)}
                          className={`py-1 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                            selectedEventCategory === cat.id
                              ? 'bg-sky-500 text-slate-950 font-bold'
                              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Grid de 2 Columnas: Lista de Eventos a la izquierda, Ficha Detallada a la derecha */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Lista de Tarjetas (7 cols) */}
                      <div className="lg:col-span-7 space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
                        {HISTORICAL_EVENTS.filter(
                          (ev) => selectedEventCategory === 'all' || ev.category === selectedEventCategory
                        ).map((event) => {
                          const isSelected = (activeHistoricalEventCard?.id || HISTORICAL_EVENTS[0].id) === event.id;
                          return (
                            <div
                              key={event.id}
                              onClick={() => setActiveHistoricalEventCard(event)}
                              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                                isSelected
                                  ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-950/40'
                                  : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800/80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${event.badgeClass}`}
                                  >
                                    {event.categoryLabel}
                                  </span>
                                  <h3 className="text-sm font-bold text-white mt-1 leading-snug">{event.title}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono-num text-xs font-bold text-sky-300 block">
                                    {event.day} {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][event.month - 1]} {event.year}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono-num">
                                    {event.hour.toString().padStart(2, '0')}:{event.minute.toString().padStart(2, '0')} UTC
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-300 line-clamp-2">{event.summary}</p>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                                <span className="flex items-center gap-1 truncate">
                                  <i className="fa-solid fa-location-dot text-amber-400 text-[10px]"></i>
                                  <span className="truncate">{event.locationName}</span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectHistoricalEvent(event);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] shrink-0 transition flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <span>Viajar</span>
                                  <i className="fa-solid fa-bolt text-[10px]"></i>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Ficha Detallada e Histórica (5 cols) */}
                      <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between max-h-[58vh] overflow-y-auto">
                        {activeHistoricalEventCard ? (
                          <div className="space-y-3.5">
                            <div>
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${activeHistoricalEventCard.badgeClass}`}
                              >
                                {activeHistoricalEventCard.categoryLabel}
                              </span>
                              <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                                {activeHistoricalEventCard.title}
                              </h3>
                              <div className="text-xs text-sky-300 font-mono-num mt-1 flex items-center gap-2">
                                <i className="fa-regular fa-clock"></i>
                                <span>
                                  {activeHistoricalEventCard.day} de {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][activeHistoricalEventCard.month - 1]} de {activeHistoricalEventCard.year} • {activeHistoricalEventCard.hour.toString().padStart(2, '0')}:{activeHistoricalEventCard.minute.toString().padStart(2, '0')} UTC
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                              <div className="text-slate-400 text-[11px]">
                                <strong className="text-slate-300">Ubicación observacional:</strong>{' '}
                                {activeHistoricalEventCard.locationName}
                              </div>
                              {activeHistoricalEventCard.lat !== undefined && (
                                <div className="text-slate-400 text-[11px] font-mono-num">
                                  <strong className="text-slate-300">Coordenadas del Pin GPS:</strong>{' '}
                                  [{activeHistoricalEventCard.lat.toFixed(2)}°, {activeHistoricalEventCard.lon?.toFixed(2)}°]
                                </div>
                              )}
                              <div className="text-amber-300/90 text-[11px] font-medium">
                                <i className="fa-solid fa-circle-info mr-1"></i>
                                {activeHistoricalEventCard.technicalSpecs}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Relevancia Histórica y Científica:
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                {activeHistoricalEventCard.historicalSignificance}
                              </p>
                            </div>

                            <button
                              onClick={() => handleSelectHistoricalEvent(activeHistoricalEventCard)}
                              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
                            >
                              <i className="fa-solid fa-wand-magic-sparkles"></i>
                              <span>Viajar a este Evento y Configurar Escena</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 py-10">Selecciona un evento del catálogo</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: SELECTOR UNIVERSAL DE FECHA Y HORA (CUALQUIER AÑO/MES/DÍA) */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Selector de Fecha (8 cols) */}
                      <div className="md:col-span-8 space-y-4">
                        {/* Control de Año con Steppers y Acceso Rápido por Siglos */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <i className="fa-solid fa-calendar text-sky-400"></i> Año:
                            </span>
                            <span className="text-[10px] text-slate-500">Soporte universal sin restricciones</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setCalYear((y) => y - 100)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Retroceder 100 años"
                            >
                              -100
                            </button>
                            <button
                              onClick={() => setCalYear((y) => y - 10)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Retroceder 10 años"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => setCalYear((y) => y - 1)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Retroceder 1 año"
                            >
                              -1
                            </button>

                            <input
                              type="number"
                              value={calYear}
                              onChange={(e) => setCalYear(parseInt(e.target.value) || 2026)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-950 border border-sky-500/50 text-center font-bold text-sky-300 text-base font-mono-num focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />

                            <button
                              onClick={() => setCalYear((y) => y + 1)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Avanzar 1 año"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => setCalYear((y) => y + 10)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Avanzar 10 años"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => setCalYear((y) => y + 100)}
                              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-num transition cursor-pointer"
                              title="Avanzar 100 años"
                            >
                              +100
                            </button>
                          </div>

                          {/* Botones de Épocas Clave */}
                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] overflow-x-auto scrollbar-none">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0">
                              Épocas:
                            </span>
                            {[
                              { label: 'S. XVII (1610)', year: 1610 },
                              { label: '1919 (Einstein)', year: 1919 },
                              { label: '1969 (Apolo)', year: 1969 },
                              { label: '1991 (México)', year: 1991 },
                              { label: '1999 (Europa)', year: 1999 },
                              { label: '2024 (Mazatlán)', year: 2024 },
                              { label: '2026 (España)', year: 2026 },
                            ].map((ep) => (
                              <button
                                key={ep.label}
                                onClick={() => setCalYear(ep.year)}
                                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition cursor-pointer shrink-0 ${
                                  calYear === ep.year
                                    ? 'bg-sky-500/30 text-sky-200 border border-sky-400 font-bold'
                                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {ep.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Selector de Mes (12 Pastillas) */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                          <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar-check text-sky-400"></i> Mes:
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 text-xs">
                            {[
                              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
                            ].map((mName, idx) => {
                              const mNum = idx + 1;
                              const isSelected = calMonth === mNum;
                              return (
                                <button
                                  key={mName}
                                  onClick={() => setCalMonth(mNum)}
                                  className={`py-1.5 px-2 rounded-xl text-center font-medium transition cursor-pointer truncate ${
                                    isSelected
                                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                                      : 'bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                                  }`}
                                >
                                  {mName.slice(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selector de Día (Rejilla interactiva 1..31) */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-slate-300 flex items-center gap-1.5">
                              <i className="fa-solid fa-calendar-day text-sky-400"></i> Día del Mes:
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {getDaysInMonth(calYear, calMonth)} días en este mes
                            </span>
                          </div>
                          <div className="grid grid-cols-7 gap-1.5 text-xs font-mono-num">
                            {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1).map((d) => {
                              const isSelected = calDay === d;
                              return (
                                <button
                                  key={d}
                                  onClick={() => setCalDay(d)}
                                  className={`py-1.5 rounded-lg text-center font-medium transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm shadow-sky-500/20'
                                      : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                                  }`}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Selector de Hora, Minuto y Vista Previa (4 cols) */}
                      <div className="md:col-span-4 space-y-4 flex flex-col justify-between">
                        {/* Hora y Minutos UTC */}
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5">
                          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <i className="fa-regular fa-clock text-sky-400"></i> Hora Universal (UTC):
                          </div>

                          {/* Hora */}
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-400">Hora (0-23 UTC):</span>
                              <span className="font-bold font-mono-num text-sky-300 bg-sky-950/70 border border-sky-500/30 px-2 py-0.5 rounded">
                                {calHour.toString().padStart(2, '0')}:00
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="23"
                              step="1"
                              value={calHour}
                              onChange={(e) => setCalHour(parseInt(e.target.value))}
                              className="w-full accent-sky-400 cursor-pointer"
                            />
                          </div>

                          {/* Minuto */}
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-400">Minuto (0-59):</span>
                              <span className="font-bold font-mono-num text-sky-300 bg-sky-950/70 border border-sky-500/30 px-2 py-0.5 rounded">
                                {calMinute.toString().padStart(2, '0')} min
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="59"
                              step="1"
                              value={calMinute}
                              onChange={(e) => setCalMinute(parseInt(e.target.value))}
                              className="w-full accent-sky-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Tarjeta de Cálculo y Vista Previa */}
                        {(() => {
                          const targetMs = Date.UTC(calYear, calMonth - 1, calDay, calHour, calMinute, 0);
                          const previewDate = new Date(targetMs);
                          const jd = getJulianDateNumber(previewDate);
                          const daysFromJ2000 = ((targetMs - J2000_EPOCH) / 86400000).toFixed(1);
                          return (
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950/30 to-slate-900 border border-sky-500/30 space-y-3">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                                Configuración Seleccionada:
                              </div>

                              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                                <div className="text-sm font-bold text-white">
                                  {previewDate.toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    timeZone: 'UTC',
                                  })}
                                </div>
                                <div className="text-xs font-mono-num text-sky-300 font-semibold">
                                  {calHour.toString().padStart(2, '0')}:{calMinute.toString().padStart(2, '0')} UTC
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono-num">
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                                  <div>Día Juliano (JD):</div>
                                  <div className="text-slate-200 font-bold mt-0.5">{jd}</div>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                                  <div>Días vs J2000:</div>
                                  <div className="text-slate-200 font-bold mt-0.5">{daysFromJ2000} d</div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleApplyCustomDate(calYear, calMonth, calDay, calHour, calMinute)}
                                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
                              >
                                <i className="fa-solid fa-bolt"></i>
                                <span>Aplicar Fecha y Calcular Mecánica</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODAL DEL TUTORIAL INTERACTIVO (ONBOARDING WALKTHROUGH TOUR) */}
        {/* ==================================================================== */}
        {showTutorial && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseTutorial(false);
              }
            }}
          >
            <div
              className="relative w-full max-w-xl space-panel rounded-3xl border border-sky-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 overflow-hidden text-slate-100 flex flex-col gap-4 sm:gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera del Tour con Progreso y Saltar */}
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-3 gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono-num font-semibold">
                    Paso {tutorialStep + 1} de {TUTORIAL_STEPS.length}
                  </span>
                  {/* Barras de progreso segmentadas */}
                  <div className="flex items-center gap-1.5">
                    {TUTORIAL_STEPS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTutorialStep(idx);
                          audioEngine.playChime('click');
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === tutorialStep
                            ? 'w-7 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                            : idx < tutorialStep
                            ? 'w-3 bg-sky-600'
                            : 'w-2 bg-slate-700/80'
                        }`}
                        title={`Ir al paso ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleCloseTutorial(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Cerrar y saltar tutorial"
                >
                  <span>Saltar</span>
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>

              {/* Contenido Dinámico del Paso Actual */}
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/25 to-indigo-600/30 border border-sky-400/40 flex items-center justify-center text-sky-300 text-xl shadow-lg shadow-sky-500/20 shrink-0">
                    <i className={TUTORIAL_STEPS[tutorialStep].icon}></i>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-400">
                      {TUTORIAL_STEPS[tutorialStep].subtitle}
                    </div>
                    <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                      {TUTORIAL_STEPS[tutorialStep].title}
                    </h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {TUTORIAL_STEPS[tutorialStep].description}
                </p>

                {/* Tarjetas destacadas / Resumen visual */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {TUTORIAL_STEPS[tutorialStep].highlights.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/30 transition flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                        <i className={h.icon}></i>
                        <span className="text-white text-xs font-bold">{h.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Casilla "No volver a mostrar" en el último paso */}
              {tutorialStep === TUTORIAL_STEPS.length - 1 && (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-sky-500/20 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs text-slate-200 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dontShowTutorialAgain}
                      onChange={(e) => setDontShowTutorialAgain(e.target.checked)}
                      className="w-4 h-4 rounded accent-sky-400 cursor-pointer"
                    />
                    <span className="font-medium">No volver a mostrar este tutorial al iniciar</span>
                  </label>
                </div>
              )}

              {/* Botones de Navegación */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                {tutorialStep > 0 ? (
                  <button
                    onClick={() => {
                      setTutorialStep(tutorialStep - 1);
                      audioEngine.playChime('click');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-left text-[11px]"></i>
                    <span>Anterior</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                    <button
                      onClick={() => {
                        setTutorialStep(tutorialStep + 1);
                        audioEngine.playChime('click');
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <span>Siguiente</span>
                      <i className="fa-solid fa-arrow-right text-[11px]"></i>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCloseTutorial(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <span>¡Comenzar a explorar!</span>
                      <i className="fa-solid fa-rocket text-xs"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// FUNCIONES DE DETECCIÓN Y CÁLCULO DE ECLIPSES
// ============================================================================
export function checkSolarEclipse(d: number, lat: number, lon: number): EclipseDetection {
  const earthOrbitAngle = (d / ASTRO.DAYS_PER_YEAR) * Math.PI * 2;
  const ex = Math.cos(earthOrbitAngle) * SCALES.earthOrbitRadius;
  const ez = -Math.sin(earthOrbitAngle) * SCALES.earthOrbitRadius;

  const moonOrbitAngle = (d / ASTRO.MOON_SIDEREAL_DAYS) * Math.PI * 2;
  const mx_unrot = Math.cos(moonOrbitAngle) * SCALES.moonOrbitRadius;
  const mz_unrot = -Math.sin(moonOrbitAngle) * SCALES.moonOrbitRadius;

  const tilt = ASTRO.MOON_ORBIT_TILT_RAD;
  const relMx = mx_unrot;
  const relMy = -Math.sin(tilt) * mz_unrot;
  const relMz = Math.cos(tilt) * mz_unrot;

  const distES = Math.hypot(ex, ez);
  const distEM = Math.sqrt(relMx * relMx + relMy * relMy + relMz * relMz);

  const dot = -ex * relMx + 0 * relMy + -ez * relMz;
  const cosTheta = Math.max(-1, Math.min(1, dot / (distES * distEM)));
  const sepRad = Math.acos(cosTheta);

  const sunAngRad = Math.atan(SCALES.sunRadius / distES);
  const moonAngRad = Math.atan(SCALES.moonRadius / distEM);
  const contactRad = sunAngRad + moonAngRad;

  const isEclipse = sepRad < contactRad;
  let type: 'Total' | 'Anular' | 'Parcial' | 'Ninguno' = 'Ninguno';
  let obscuration = 0;

  if (isEclipse) {
    if (sepRad <= Math.abs(sunAngRad - moonAngRad)) {
      type = moonAngRad >= sunAngRad ? 'Total' : 'Anular';
      obscuration = 100;
    } else {
      type = 'Parcial';
      const maxOverlap = 2 * Math.min(sunAngRad, moonAngRad);
      const overlap = contactRad - sepRad;
      obscuration = Math.min(99.9, Math.max(1, (overlap / maxOverlap) * 100));
    }
  }

  // Visibilidad local (sincronizada con la rotación UTC y dirección del Sol)
  const simDate = new Date(ASTRO.EPOCH_TIME + d * 86400000);
  const utcHours = simDate.getUTCHours() + simDate.getUTCMinutes() / 60 + simDate.getUTCSeconds() / 3600;
  const sunAngle = earthOrbitAngle + Math.PI;
  const utcFraction = (utcHours - 12.0) / 24.0;
  const earthSpinAngle = sunAngle + utcFraction * Math.PI * 2;

  const phi = (lon + 180) * (Math.PI / 180);
  const theta = (90 - lat) * (Math.PI / 180);
  const localX = -Math.cos(phi) * Math.sin(theta);
  const localZ = Math.sin(phi) * Math.sin(theta);
  const normX = localX * Math.cos(earthSpinAngle) - localZ * Math.sin(earthSpinAngle);
  const normZ = localX * Math.sin(earthSpinAngle) + localZ * Math.cos(earthSpinAngle);
  const pinSunDot = (normX * -ex + normZ * -ez) / distES;

  return {
    active: isEclipse,
    type,
    obscuration: parseFloat(obscuration.toFixed(1)),
    sepDeg: ((sepRad * 180) / Math.PI).toFixed(2),
    contactDeg: ((contactRad * 180) / Math.PI).toFixed(2),
    visibleFromLocation: isEclipse && pinSunDot > 0,
  };
}

export function checkLunarEclipse(d: number, lat: number, lon: number): EclipseDetection {
  const earthOrbitAngle = (d / ASTRO.DAYS_PER_YEAR) * Math.PI * 2;
  const ex = Math.cos(earthOrbitAngle) * SCALES.earthOrbitRadius;
  const ez = -Math.sin(earthOrbitAngle) * SCALES.earthOrbitRadius;

  const moonOrbitAngle = (d / ASTRO.MOON_SIDEREAL_DAYS) * Math.PI * 2;
  const mx_unrot = Math.cos(moonOrbitAngle) * SCALES.moonOrbitRadius;
  const mz_unrot = -Math.sin(moonOrbitAngle) * SCALES.moonOrbitRadius;

  const tilt = ASTRO.MOON_ORBIT_TILT_RAD;
  const relMx = mx_unrot;
  const relMy = -Math.sin(tilt) * mz_unrot;
  const relMz = Math.cos(tilt) * mz_unrot;

  const distES = Math.hypot(ex, ez);
  const uShadowX = ex / distES;
  const uShadowZ = ez / distES;

  const proj = relMx * uShadowX + relMz * uShadowZ;
  if (proj <= 0) {
    return {
      active: false,
      type: 'Ninguno',
      obscuration: 0,
      sepDeg: '180.00',
      contactDeg: '0.00',
      visibleFromLocation: false,
    };
  }

  const perpX = relMx - proj * uShadowX;
  const perpY = relMy;
  const perpZ = relMz - proj * uShadowZ;
  const distPerp = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);

  const sunEarthRadiusDiff = (SCALES.sunRadius - SCALES.earthRadius) / distES;
  const rUmbra = Math.max(0.1, SCALES.earthRadius - proj * sunEarthRadiusDiff);
  const rContact = rUmbra + SCALES.moonRadius;

  const isEclipse = distPerp < rContact;
  let type: 'Total' | 'Anular' | 'Parcial' | 'Ninguno' = 'Ninguno';
  let obscuration = 0;

  if (isEclipse) {
    if (distPerp <= Math.abs(rUmbra - SCALES.moonRadius)) {
      type = 'Total';
      obscuration = 100;
    } else {
      type = 'Parcial';
      const maxOverlap = 2 * Math.min(rUmbra, SCALES.moonRadius);
      const overlap = rContact - distPerp;
      obscuration = Math.min(99.9, Math.max(1, (overlap / maxOverlap) * 100));
    }
  }

  return {
    active: isEclipse,
    type,
    obscuration: parseFloat(obscuration.toFixed(1)),
    sepDeg: ((Math.atan2(distPerp, proj) * 180) / Math.PI).toFixed(2),
    contactDeg: ((Math.atan2(rContact, proj) * 180) / Math.PI).toFixed(2),
    visibleFromLocation: isEclipse,
  };
}

export function findNextSolarEclipse(currentDays: number): number | null {
  const step = 0.04;
  let bestDay: number | null = null;
  let minSep = 999;
  let inZone = false;

  for (let offset = 0.1; offset < 400; offset += step) {
    const d = currentDays + offset;
    const status = checkSolarEclipse(d, 0, 0);
    if (status.active) {
      inZone = true;
      const sep = parseFloat(status.sepDeg);
      if (sep < minSep) {
        minSep = sep;
        bestDay = d;
      }
    } else if (inZone) break;
  }
  return bestDay;
}

export function findNextLunarEclipse(currentDays: number): number | null {
  const step = 0.04;
  let bestDay: number | null = null;
  let minSep = 999;
  let inZone = false;

  for (let offset = 0.1; offset < 400; offset += step) {
    const d = currentDays + offset;
    const status = checkLunarEclipse(d, 0, 0);
    if (status.active) {
      inZone = true;
      const sep = parseFloat(status.sepDeg);
      if (sep < minSep) {
        minSep = sep;
        bestDay = d;
      }
    } else if (inZone) break;
  }
  return bestDay;
}

// ============================================================================
// GENERADORES PROCEDURALES Y ELEMENTOS GRÁFICOS
// ============================================================================
function createProceduralTextures() {
  // A. Día
  const dayC = document.createElement('canvas');
  dayC.width = 1024; dayC.height = 512;
  const dCtx = dayC.getContext('2d')!;
  const grad = dCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0c4a6e');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0c4a6e');
  dCtx.fillStyle = grad;
  dCtx.fillRect(0, 0, 1024, 512);

  const continents = [
    { x: 230, y: 155, rx: 75, ry: 50, color: '#166534' },
    { x: 310, y: 310, rx: 45, ry: 85, color: '#15803d' },
    { x: 530, y: 140, rx: 60, ry: 40, color: '#166534' },
    { x: 540, y: 270, rx: 55, ry: 80, color: '#ca8a04' },
    { x: 720, y: 170, rx: 110, ry: 65, color: '#166534' },
    { x: 820, y: 355, rx: 40, ry: 30, color: '#d97706' },
  ];
  continents.forEach(c => {
    dCtx.fillStyle = c.color;
    dCtx.beginPath();
    dCtx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    dCtx.fill();
  });
  dCtx.fillStyle = '#f8fafc';
  dCtx.fillRect(0, 0, 1024, 25);
  dCtx.fillRect(0, 485, 1024, 27);

  // B. Noche (Base limpia profunda 100% libre de ruido procedural o manchas)
  const nightC = document.createElement('canvas');
  nightC.width = 1024; nightC.height = 512;
  const nCtx = nightC.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, 1024, 512);

  // C. Nubes
  const cloudC = document.createElement('canvas');
  cloudC.width = 1024; cloudC.height = 512;
  const cCtx = cloudC.getContext('2d')!;
  cCtx.clearRect(0, 0, 1024, 512);
  for (let i = 0; i < 300; i++) {
    cCtx.fillStyle = `rgba(255, 255, 255, ${0.08 + Math.random() * 0.22})`;
    cCtx.beginPath();
    cCtx.ellipse(
      Math.random() * 1024,
      Math.random() * 512,
      20 + Math.random() * 70,
      5 + Math.random() * 16,
      Math.random() * 0.4,
      0,
      Math.PI * 2
    );
    cCtx.fill();
  }

  // D. Luna
  const moonC = document.createElement('canvas');
  moonC.width = 1024; moonC.height = 512;
  const mCtx = moonC.getContext('2d')!;
  mCtx.fillStyle = '#94a3b8';
  mCtx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 30; i++) {
    mCtx.fillStyle = `rgba(51, 65, 85, ${0.15 + Math.random() * 0.3})`;
    mCtx.beginPath();
    mCtx.arc(Math.random() * 1024, 80 + Math.random() * 350, 20 + Math.random() * 65, 0, Math.PI * 2);
    mCtx.fill();
  }
  for (let i = 0; i < 400; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 512;
    const cr = 2 + Math.random() * 14;
    mCtx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    mCtx.lineWidth = 1.2;
    mCtx.beginPath();
    mCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    mCtx.stroke();
    mCtx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    mCtx.fill();
  }

  // E. Sol
  const sunC = document.createElement('canvas');
  sunC.width = 1024; sunC.height = 512;
  const sCtx = sunC.getContext('2d')!;
  const sGrad = sCtx.createLinearGradient(0, 0, 0, 512);
  sGrad.addColorStop(0, '#fffbeb');
  sGrad.addColorStop(0.3, '#fbbf24');
  sGrad.addColorStop(0.7, '#ea580c');
  sGrad.addColorStop(1, '#fffbeb');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 3000; i++) {
    sCtx.fillStyle = Math.random() > 0.4 ? 'rgba(255, 255, 230, 0.25)' : 'rgba(180, 40, 0, 0.18)';
    sCtx.beginPath();
    sCtx.arc(Math.random() * 1024, Math.random() * 512, 1 + Math.random() * 9, 0, Math.PI * 2);
    sCtx.fill();
  }

  return {
    earthDayTex: new THREE.CanvasTexture(dayC),
    earthNightTex: new THREE.CanvasTexture(nightC),
    earthCloudsTex: new THREE.CanvasTexture(cloudC),
    moonTex: new THREE.CanvasTexture(moonC),
    sunTex: new THREE.CanvasTexture(sunC),
  };
}

function createSunCoronaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1)');
  grad.addColorStop(0.25, 'rgba(251, 191, 36, 0.85)');
  grad.addColorStop(0.6, 'rgba(234, 88, 12, 0.28)');
  grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

// ============================================================================
// CAMPO ESTELAR REALISTA Y BANDA DE LA VÍA LÁCTEA (CERO DISTORSIÓN DE PARALAJE, R = 3600)
// ============================================================================
function createStarfield(scene: THREE.Scene): THREE.Group {
  const SPHERE_RADIUS = 12000;
  const starfieldGroup = new THREE.Group();

  // 1. Estrellas con temperaturas de cuerpo negro / espectros reales (8,500 estrellas)
  const starCount = 8500;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  // Paletas espectrales según temperatura estelar (O/B, A/F, G/K, M)
  const spectralTypes = [
    { p: 0.12, r: 0.70, g: 0.85, b: 1.0 },   // O/B: Blanco-azulado caliente (~25,000K)
    { p: 0.38, r: 0.98, g: 0.98, b: 1.0 },   // A: Blanco puro (~9,500K)
    { p: 0.58, r: 1.0,  g: 0.95, b: 0.88 },  // F: Blanco-amarillento suave (~7,000K)
    { p: 0.82, r: 1.0,  g: 0.82, b: 0.54 },  // G/K: Amarillo solar a ámbar cálido (~5,500K)
    { p: 1.00, r: 1.0,  g: 0.54, b: 0.38 },  // M: Enana/gigante roja sutil (~3,200K)
  ];

  for (let i = 0; i < starCount; i++) {
    // Distribución esférica uniforme a distancia fija R = 3600 (cero distorsión de paralaje)
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const phi = Math.acos(u);

    starPositions[i * 3]     = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = SPHERE_RADIUS * Math.cos(phi);

    // Selección espectral y magnitud estelar
    const roll = Math.random();
    let spec = spectralTypes[0];
    for (const t of spectralTypes) {
      if (roll <= t.p) {
        spec = t;
        break;
      }
    }

    const brightness = 0.65 + Math.random() * 0.35;
    starColors[i * 3]     = spec.r * brightness;
    starColors[i * 3 + 1] = spec.g * brightness;
    starColors[i * 3 + 2] = spec.b * brightness;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  starfieldGroup.add(new THREE.Points(starGeo, starMat));

  // 2. Banda difusa de la Vía Láctea (Milky Way) con 7,500 partículas en el plano galáctico inclinado (~63°)
  const mwCount = 7500;
  const mwPositions = new Float32Array(mwCount * 3);
  const mwColors = new Float32Array(mwCount * 3);

  // Matriz de transformación galáctica a ecuatorial (inclinación ~62.87°, nodo ~282.25°)
  const mwEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(62.87),
    THREE.MathUtils.degToRad(18.5),
    THREE.MathUtils.degToRad(33.0),
    'XYZ'
  );
  const mwMatrix = new THREE.Matrix4().makeRotationFromEuler(mwEuler);

  for (let i = 0; i < mwCount; i++) {
    // Densidad central reforzada hacia el núcleo de Sagitario (l = 0)
    let l: number;
    if (Math.random() < 0.42) {
      // Región del bulbo galáctico
      l = (Math.random() - 0.5) * 1.1;
    } else {
      // Disco galáctico completo
      l = (Math.random() - 0.5) * Math.PI * 2;
    }

    // Dispersión gaussiana de latitud galáctica (más ancha en el bulbo)
    const isBulge = Math.abs(l) < 0.55;
    const sigmaB = isBulge ? 0.22 : 0.13;
    const b = (Math.random() + Math.random() + Math.random() - 1.5) * (sigmaB * 2.4);

    // Coordenadas esféricas en el marco galáctico a R = 3590
    const R_MW = SPHERE_RADIUS - 10;
    const xg = R_MW * Math.cos(b) * Math.cos(l);
    const yg = R_MW * Math.sin(b);
    const zg = R_MW * Math.cos(b) * Math.sin(l);

    const posVec = new THREE.Vector3(xg, yg, zg).applyMatrix4(mwMatrix);
    mwPositions[i * 3]     = posVec.x;
    mwPositions[i * 3 + 1] = posVec.y;
    mwPositions[i * 3 + 2] = posVec.z;

    // Coloración: bulbo cálido dorado vs. brazos de polvo estelar azul-plata
    if (isBulge) {
      const bFactor = 0.55 + Math.random() * 0.45;
      mwColors[i * 3]     = 1.0 * bFactor;
      mwColors[i * 3 + 1] = 0.84 * bFactor;
      mwColors[i * 3 + 2] = 0.62 * bFactor;
    } else {
      const armFactor = 0.45 + Math.random() * 0.45;
      mwColors[i * 3]     = 0.82 * armFactor;
      mwColors[i * 3 + 1] = 0.88 * armFactor;
      mwColors[i * 3 + 2] = 1.0 * armFactor;
    }
  }

  const mwGeo = new THREE.BufferGeometry();
  mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
  mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));
  const mwMat = new THREE.PointsMaterial({
    size: 3.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  starfieldGroup.add(new THREE.Points(mwGeo, mwMat));
  scene.add(starfieldGroup);
  return starfieldGroup;
}

function createShadowCone(rTop: number, rBottom: number, height: number, colorHex: number, opacity: number) {
  const geo = new THREE.CylinderGeometry(rBottom, rTop, height, 32, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function createGpsPin() {
  const pinGroup = new THREE.Group();

  // Anillo de base
  const ringGeo = new THREE.RingGeometry(0.08, 0.16, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  pinGroup.add(ring);

  // Mástil luminoso
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 0.275;
  pinGroup.add(pole);

  // Esfera brillante en la punta
  const tipGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.y = 0.55;
  pinGroup.add(tip);

  // Anillo de radar con pulso animado
  const pulseGeo = new THREE.RingGeometry(0.18, 0.26, 24);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
  pulseMesh.rotation.x = Math.PI / 2;
  pinGroup.add(pulseMesh);

  return { pinGroup, pulseMesh };
}

function createMoonNearSideMarker() {
  const group = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.rotation.z = Math.PI / 2;
  pole.position.set(-1.2, 0, 0);
  group.add(pole);

  const tipGeo = new THREE.SphereGeometry(0.065, 12, 12);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(-1.45, 0, 0);
  group.add(tip);
  return group;
}

function createAxisIndicator(halfLength: number, colorHex: number) {
  const group = new THREE.Group();
  const points = [new THREE.Vector3(0, -halfLength, 0), new THREE.Vector3(0, halfLength, 0)];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geo, mat);
  group.add(line);

  const coneGeo = new THREE.ConeGeometry(0.12, 0.3, 12);
  const coneMat = new THREE.MeshBasicMaterial({ color: colorHex });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = halfLength;
  group.add(cone);
  return group;
}

function createCircleLine(radius: number, segments: number, colorHex: number, opacity: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, -Math.sin(theta) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity });
  return new THREE.Line(geo, mat);
}

function loadHighResTextures(
  earthMat: THREE.MeshPhongMaterial,
  earthCloudsMat: THREE.MeshStandardMaterial,
  moonMat: THREE.MeshStandardMaterial,
  maxAnisotropy = 8
) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const base = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/';

  // 1. Luces nocturnas reales de la NASA / Three.js
  loader.load(
    base + 'earth_lights_2048.png',
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      earthMat.emissiveMap = tex;
      earthMat.needsUpdate = true;
    },
    undefined,
    () => {} // Ignorar fallo de red sin bloquear la escena
  );

  // 2. Textura diurna
  loader.load(
    base + 'earth_atmos_2048.jpg',
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  // 3. Nubes
  loader.load(
    base + 'earth_clouds_1024.png',
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      earthCloudsMat.map = tex;
      earthCloudsMat.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  // 4. Luna
  loader.load(
    base + 'moon_1024.jpg',
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      moonMat.map = tex;
      moonMat.needsUpdate = true;
    },
    undefined,
    () => {}
  );
}

// ============================================================================
// SISTEMA DE SATÉLITES ARTIFICIALES (MECÁNICA KEPLERIANA VIS-VIVA)
// ============================================================================
export function getOrbitalTransformMatrix(raan: number, inc: number, argPer: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const mRaan = new THREE.Matrix4().makeRotationY(raan);
  const mInc = new THREE.Matrix4().makeRotationZ(inc);
  const mArg = new THREE.Matrix4().makeRotationY(argPer);
  return m.multiply(mRaan).multiply(mInc).multiply(mArg);
}



export function createSatelliteCraft(def: SatelliteDef): THREE.Group {
  const craft = new THREE.Group();

  if (def.id === 'iss') {
    // ISS: Módulo central y armazón largo con paneles cuádruples
    const trussGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6);
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const truss = new THREE.Mesh(trussGeo, trussMat);
    truss.rotation.z = Math.PI / 2;
    craft.add(truss);

    const moduleGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.32, 10);
    const moduleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9, roughness: 0.2 });
    const centerModule = new THREE.Mesh(moduleGeo, moduleMat);
    craft.add(centerModule);

    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.3,
      roughness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
    });
    const wingGeo = new THREE.BoxGeometry(0.32, 0.015, 0.12);

    const wingL1 = new THREE.Mesh(wingGeo, solarMat);
    wingL1.position.set(-0.35, 0.06, 0);
    craft.add(wingL1);

    const wingL2 = new THREE.Mesh(wingGeo, solarMat);
    wingL2.position.set(-0.35, -0.06, 0);
    craft.add(wingL2);

    const wingR1 = new THREE.Mesh(wingGeo, solarMat);
    wingR1.position.set(0.35, 0.06, 0);
    craft.add(wingR1);

    const wingR2 = new THREE.Mesh(wingGeo, solarMat);
    wingR2.position.set(0.35, -0.06, 0);
    craft.add(wingR2);
  } else if (def.id === 'hubble') {
    // Hubble: Telescopio cilíndrico reflectante con compuerta y paneles laterales
    const tubeGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.34, 12);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.x = Math.PI / 2;
    craft.add(tube);

    const doorGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.03, 12);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0, 0.18);
    door.rotation.x = Math.PI / 2;
    craft.add(door);

    const panelGeo = new THREE.BoxGeometry(0.24, 0.015, 0.10);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e40af,
      emissiveIntensity: 0.4,
    });
    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.set(-0.20, 0, 0);
    craft.add(panelL);
    const panelR = new THREE.Mesh(panelGeo, panelMat);
    panelR.position.set(0.20, 0, 0);
    craft.add(panelR);
  } else {
    // Satélites genéricos con bus y paneles solares orientables
    const bodyGeo = new THREE.BoxGeometry(0.14, 0.10, 0.14);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.type === 'GEO' ? 0xfef08a : 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    craft.add(body);

    const panelGeo = new THREE.BoxGeometry(0.28, 0.012, 0.11);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.4,
      roughness: 0.25,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
    });
    const pL = new THREE.Mesh(panelGeo, panelMat);
    pL.position.set(-0.22, 0, 0);
    craft.add(pL);
    const pR = new THREE.Mesh(panelGeo, panelMat);
    pR.position.set(0.22, 0, 0);
    craft.add(pR);

    // Antena parabólica hacia la Tierra
    const dishGeo = new THREE.ConeGeometry(0.06, 0.04, 10, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, -0.06, 0);
    craft.add(dish);
  }

  // Baliza luminosa parpadeante
  const beaconGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const beaconMat = new THREE.MeshBasicMaterial({ color: def.colorHex });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 0.08, 0);
  craft.add(beacon);

  return craft;
}

export function createSatelliteTrajectory(def: SatelliteDef): THREE.Line {
  const segments = 128;
  const pts: THREE.Vector3[] = [];
  const rotMatrix = getOrbitalTransformMatrix(def.raan, def.i, def.argPer);
  const b = def.a * Math.sqrt(Math.max(0.001, 1 - def.e * def.e));

  for (let s = 0; s <= segments; s++) {
    const E = (s / segments) * Math.PI * 2;
    const x0 = def.a * (Math.cos(E) - def.e);
    const z0 = b * Math.sin(E);
    const p = new THREE.Vector3(x0, 0, z0).applyMatrix4(rotMatrix);
    pts.push(p);
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: def.colorHex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}

export function createSatellitesSystem(earthTiltNode: THREE.Group) {
  const satellitesGroup = new THREE.Group();
  earthTiltNode.add(satellitesGroup);

  const satelliteObjects = SATELLITE_DEFS.map((def) => {
    const orbitLine = createSatelliteTrajectory(def);
    satellitesGroup.add(orbitLine);

    const mesh = createSatelliteCraft(def);
    satellitesGroup.add(mesh);

    return { def, mesh, orbitLine };
  });

  return { satellitesGroup, satelliteObjects };
}

export function updateSatellitesPhysics(
  satelliteObjects: { def: SatelliteDef; mesh: THREE.Group; orbitLine: THREE.Line }[],
  simDays: number
) {
  satelliteObjects.forEach(({ def, mesh }) => {
    // Ecuación de Kepler y velocidad orbital proporcional a altitud
    const M = (def.m0 + def.meanMotion * simDays) % (Math.PI * 2);
    const E = solveKepler(M, def.e);
    const b = def.a * Math.sqrt(Math.max(0.001, 1 - def.e * def.e));

    const x0 = def.a * (Math.cos(E) - def.e);
    const z0 = b * Math.sin(E);

    // Vector velocidad tangente (dx/dE, dz/dE)
    const dx0 = -def.a * Math.sin(E);
    const dz0 = b * Math.cos(E);

    const rotMatrix = getOrbitalTransformMatrix(def.raan, def.i, def.argPer);
    const pos = new THREE.Vector3(x0, 0, z0).applyMatrix4(rotMatrix);
    const tangent = new THREE.Vector3(dx0, 0, dz0).applyMatrix4(rotMatrix).normalize();

    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
  });
}



// ============================================================================
// SISTEMA SOLAR COMPLETO: PLANETAS Y SUS RESPECTIVOS SATÉLITES NATURALES
// ============================================================================

export function createPlanetTexture(def: PlanetDef): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const hexColor = '#' + def.surfaceColorHex.toString(16).padStart(6, '0');
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 512, 256);

  if (def.id === 'mercury') {
    // Cráteres y superficie grisácea rocosa con regolito
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 90; i++) {
      const cx = (Math.sin(i * 13.7) * 0.5 + 0.5) * 512;
      const cy = (Math.cos(i * 9.3) * 0.5 + 0.5) * 256;
      const rad = 2 + (i % 7) * 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#4b5563' : '#9ca3af';
      ctx.fill();
    }
  } else if (def.id === 'venus') {
    // Atmósfera densa de ácido sulfúrico con bandas arremolinadas
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(0.8, '#d97706');
    grad.addColorStop(1, '#fef08a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
    for (let y = 10; y < 250; y += 18) {
      ctx.beginPath();
      ctx.ellipse(256 + Math.sin(y * 0.08) * 80, y, 140, 6, Math.PI * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (def.id === 'mars') {
    // Planeta rojo: regolito ferruginoso, cuencas oscuras y casquetes polares
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(67, 20, 7, 0.45)';
    ctx.beginPath();
    ctx.ellipse(190, 130, 90, 45, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(370, 150, 110, 50, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Casquetes polares de hielo y dióxido de carbono
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 20); // Polo Norte
    ctx.fillRect(0, 238, 512, 18); // Polo Sur
  } else if (def.id === 'jupiter') {
    // Gigante gaseoso: bandas alternadas marrón, ocre y crema
    const bands = [
      '#78350f', '#fef3c7', '#92400e', '#fed7aa', '#b45309',
      '#fde68a', '#78350f', '#ffedd5', '#9a3412', '#fef3c7',
      '#b45309', '#fed7aa', '#78350f', '#fde68a'
    ];
    const bandHeight = 256 / bands.length;
    bands.forEach((bColor, idx) => {
      ctx.fillStyle = bColor;
      ctx.fillRect(0, idx * bandHeight, 512, bandHeight);
    });
    for (let b = 0; b < 10; b++) {
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const y0 = 30 + b * 20;
      for (let x = 0; x <= 512; x += 16) {
        const y = y0 + Math.sin(x * 0.05 + b) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Gran Mancha Roja (tormenta anticiclónica a ~22° latitud sur)
    ctx.save();
    ctx.translate(320, 168);
    const gSpot = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
    gSpot.addColorStop(0, '#991b1b');
    gSpot.addColorStop(0.6, '#dc2626');
    gSpot.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = gSpot;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (def.id === 'saturn') {
    // Bandas doradas tenues
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ca8a04');
    grad.addColorStop(0.2, '#fde047');
    grad.addColorStop(0.4, '#eab308');
    grad.addColorStop(0.6, '#fef08a');
    grad.addColorStop(0.8, '#d97706');
    grad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 12) {
      ctx.fillStyle = 'rgba(161, 98, 7, 0.12)';
      ctx.fillRect(0, y, 512, 5);
    }
  } else if (def.id === 'uranus') {
    // Gigante de hielo color turquesa suave y uniforme
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#67e8f9');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, y, 512, 6);
    }
  } else if (def.id === 'neptune') {
    // Gigante de hielo color azul cobalto profundo
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.4, '#2563eb');
    grad.addColorStop(0.7, '#1e40af');
    grad.addColorStop(1, '#172554');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.ellipse(280, 110, 36, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
    ctx.beginPath();
    ctx.ellipse(275, 98, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.id === 'pluto') {
    // Superficie rocosa con corazón de nitrógeno brillante (Tombaugh Regio)
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(69, 26, 3, 0.5)';
    ctx.fillRect(0, 140, 512, 60);
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(250, 115, 45, 35, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(285, 125, 35, 30, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createSaturnRingsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256);

  // Hueco interior transparente para el globo del planeta
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.38, 'rgba(0, 0, 0, 0)');

  // Anillo C tenue (Crepe Ring)
  grad.addColorStop(0.40, 'rgba(161, 98, 7, 0.25)');
  grad.addColorStop(0.48, 'rgba(217, 119, 6, 0.45)');

  // Anillo B brillante, ancho y denso
  grad.addColorStop(0.50, 'rgba(253, 224, 71, 0.95)');
  grad.addColorStop(0.66, 'rgba(250, 204, 21, 0.85)');

  // División de Cassini (espacio oscuro nítido)
  grad.addColorStop(0.67, 'rgba(15, 23, 42, 0.05)');
  grad.addColorStop(0.71, 'rgba(15, 23, 42, 0.05)');

  // Anillo A exterior
  grad.addColorStop(0.72, 'rgba(252, 211, 77, 0.75)');
  grad.addColorStop(0.85, 'rgba(217, 119, 6, 0.6)');

  // División de Encke tenue
  grad.addColorStop(0.86, 'rgba(15, 23, 42, 0.1)');

  // Borde exterior
  grad.addColorStop(0.90, 'rgba(217, 119, 6, 0.3)');
  grad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

export function createUranusRingsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256);

  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.68, 'rgba(56, 189, 248, 0.35)');
  grad.addColorStop(0.74, 'rgba(186, 230, 253, 0.65)');
  grad.addColorStop(0.77, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(0.80, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

export function createPlanetRingMesh(planetId: string, planetRadius: number): THREE.Mesh {
  let innerR = planetRadius * 1.3;
  let outerR = planetRadius * 2.45;
  let ringTex = createSaturnRingsTexture();
  if (planetId === 'uranus') {
    innerR = planetRadius * 1.25;
    outerR = planetRadius * 2.05;
    ringTex = createUranusRingsTexture();
  }
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    map: ringTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    roughness: 0.6,
    metalness: 0.1,
  });
  return new THREE.Mesh(ringGeo, ringMat);
}

export interface AsteroidBeltSystem {
  mesh: THREE.InstancedMesh;
  data: { a_AU: number; e: number; i_rad: number; Om_rad: number; M0_rad: number; speed: number; scale: number }[];
  ceresNode: THREE.Group;
  ceresMesh: THREE.Mesh;
  vestaNode: THREE.Group;
  vestaMesh: THREE.Mesh;
}

export function createAsteroidBelt(scene: THREE.Scene): AsteroidBeltSystem {
  const count = 2500;
  const geo = new THREE.DodecahedronGeometry(0.35, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9, metalness: 0.1 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const data: { a_AU: number; e: number; i_rad: number; Om_rad: number; M0_rad: number; speed: number; scale: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a_AU = 2.15 + Math.random() * 1.15;
    const e = 0.02 + Math.random() * 0.16;
    const i_rad = (Math.random() - 0.5) * 0.28;
    const Om_rad = Math.random() * Math.PI * 2;
    const M0_rad = Math.random() * Math.PI * 2;
    const speed = 0.25 / Math.sqrt(a_AU * a_AU * a_AU);
    const scale = 0.5 + Math.random() * 1.2;
    data.push({ a_AU, e, i_rad, Om_rad, M0_rad, speed, scale });
  }

  scene.add(mesh);

  const ceresNode = new THREE.Group();
  const vestaNode = new THREE.Group();
  scene.add(ceresNode);
  scene.add(vestaNode);

  const ceresMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  const ceresMesh = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), ceresMat);
  ceresNode.add(ceresMesh);

  const vestaMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
  const vestaMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), vestaMat);
  vestaNode.add(vestaMesh);

  return { mesh, data, ceresNode, ceresMesh, vestaNode, vestaMesh };
}

export function updateAsteroidBelt(
  belt: AsteroidBeltSystem,
  simDays: number,
  showAsteroids: boolean,
  scientificScale: boolean
) {
  belt.mesh.visible = showAsteroids;
  belt.ceresNode.visible = showAsteroids;
  belt.vestaNode.visible = showAsteroids;
  if (!showAsteroids) return;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < belt.data.length; i++) {
    const a = belt.data[i];
    const M = a.M0_rad + a.speed * simDays * 0.05;
    const r_scaled = getScaledOrbitRadius(a.a_AU, scientificScale);
    const x = Math.cos(M) * r_scaled;
    const y = Math.sin(M * 2.0 + a.Om_rad) * (r_scaled * a.i_rad * 0.3);
    const z = Math.sin(M) * r_scaled;

    dummy.position.set(x, y, z);
    dummy.scale.setScalar(a.scale);
    dummy.rotation.set(M * 2, M * 3, 0);
    dummy.updateMatrix();
    belt.mesh.setMatrixAt(i, dummy.matrix);
  }
  belt.mesh.instanceMatrix.needsUpdate = true;

  // Ceres: 2.767 UA
  const cM = (simDays * 0.021) % (Math.PI * 2);
  const cr = getScaledOrbitRadius(2.767, scientificScale);
  belt.ceresNode.position.set(Math.cos(cM) * cr, Math.sin(cM) * (cr * 0.18), Math.sin(cM) * cr);

  // Vesta: 2.362 UA
  const vM = (simDays * 0.027 + 1.2) % (Math.PI * 2);
  const vr = getScaledOrbitRadius(2.362, scientificScale);
  belt.vestaNode.position.set(Math.cos(vM) * vr, Math.sin(vM) * (vr * 0.12), Math.sin(vM) * vr);
}

export function createSolarSystemPlanets(scene: THREE.Scene, scientificScale: boolean): PlanetObject[] {
  const planetsList: PlanetObject[] = [];

  PLANETS_CATALOGUE.forEach((def) => {
    const orbitNode = new THREE.Group();
    scene.add(orbitNode);

    // Línea orbital elíptica precisa
    const segs = 128, pts: THREE.Vector3[] = [];
    const Om_rad = THREE.MathUtils.degToRad(def.Omega_deg);
    const i_rad = THREE.MathUtils.degToRad(def.i_deg);
    const om_rad = THREE.MathUtils.degToRad(def.omega_deg);

    for (let s = 0; s <= segs; s++) {
      const E = (s / segs) * Math.PI * 2;
      const nu = 2 * Math.atan2(Math.sqrt(1 + def.e) * Math.sin(E / 2), Math.sqrt(1 - def.e) * Math.cos(E / 2));
      const r_AU = def.a_AU * (1 - def.e * Math.cos(E));
      const r_scaled = getScaledOrbitRadius(r_AU, scientificScale);
      const u = om_rad + nu;
      const x = r_scaled * (Math.cos(Om_rad) * Math.cos(u) - Math.sin(Om_rad) * Math.sin(u) * Math.cos(i_rad));
      const y = r_scaled * (Math.sin(u) * Math.sin(i_rad));
      const z = r_scaled * (Math.sin(Om_rad) * Math.cos(u) + Math.cos(Om_rad) * Math.sin(u) * Math.cos(i_rad));
      pts.push(new THREE.Vector3(x, y, z));
    }

    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: def.surfaceColorHex, transparent: true, opacity: 0.32, depthWrite: false })
    );
    scene.add(orbitLine);

    // Nodo de Inclinación Axial (Oblicuidad)
    const tiltNode = new THREE.Group();
    tiltNode.rotation.z = (def.tilt_deg * Math.PI) / 180;
    orbitNode.add(tiltNode);

    // Malla del Planeta con sistema Level of Detail (LOD) para máximo rendimiento de FPS
    const tex = createPlanetTexture(def);
    const planetMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.75,
      metalness: 0.08,
    });

    const planetLOD = new THREE.LOD();

    // Nivel 0 - Alto detalle (< 70 unidades): 48x48 segmentos
    const geoHigh = new THREE.SphereGeometry(def.radius, 48, 48);
    const meshHigh = new THREE.Mesh(geoHigh, planetMat);
    meshHigh.castShadow = false;
    meshHigh.receiveShadow = false;
    meshHigh.userData = { planetId: def.id };
    planetLOD.addLevel(meshHigh, 0);

    // Nivel 1 - Detalle medio (70 - 180 unidades): 24x24 segmentos
    const geoMed = new THREE.SphereGeometry(def.radius, 24, 24);
    const meshMed = new THREE.Mesh(geoMed, planetMat);
    meshMed.castShadow = false;
    meshMed.receiveShadow = false;
    meshMed.userData = { planetId: def.id };
    planetLOD.addLevel(meshMed, 70);

    // Nivel 2 - Bajo detalle (> 180 unidades): 12x12 segmentos
    const geoLow = new THREE.SphereGeometry(def.radius, 12, 12);
    const meshLow = new THREE.Mesh(geoLow, planetMat);
    meshLow.castShadow = false;
    meshLow.receiveShadow = false;
    meshLow.userData = { planetId: def.id };
    planetLOD.addLevel(meshLow, 180);

    planetLOD.userData = { planetId: def.id };
    tiltNode.add(planetLOD);
    const planetMesh = planetLOD;

    // Anillos planetarios nativos estables con RingGeometry y MeshStandardMaterial
    let ringsMesh: THREE.Mesh | undefined;
    if (def.hasRings) {
      ringsMesh = createPlanetRingMesh(def.id, def.radius);
      tiltNode.add(ringsMesh);
    }

    // Satélites Naturales (Lunas) con sus órbitas locales
    const moonsList: {
      def: MoonDef;
      orbitNode: THREE.Group;
      mesh: THREE.Mesh;
      orbitLine: THREE.Line;
    }[] = [];

    def.moons.forEach((mDef) => {
      const moonOrbitNode = new THREE.Group();
      orbitNode.add(moonOrbitNode);

      const mPts: THREE.Vector3[] = [];
      for (let s = 0; s <= 64; s++) {
        const a = (s / 64) * Math.PI * 2;
        mPts.push(new THREE.Vector3(Math.cos(a) * mDef.orbitRadius, 0, Math.sin(a) * mDef.orbitRadius));
      }
      const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
      const mMat = new THREE.LineBasicMaterial({
        color: mDef.colorHex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const moonOrbitLine = new THREE.Line(mGeo, mMat);
      moonOrbitNode.add(moonOrbitLine);

      const moonMeshGeo = new THREE.SphereGeometry(mDef.radius, 16, 16);
      const moonMeshMat = new THREE.MeshStandardMaterial({
        color: mDef.colorHex,
        roughness: 0.85,
        metalness: 0.05,
      });
      const moonMesh = new THREE.Mesh(moonMeshGeo, moonMeshMat);
      moonMesh.castShadow = false;
      moonMesh.receiveShadow = false;
      moonOrbitNode.add(moonMesh);

      moonsList.push({
        def: mDef,
        orbitNode: moonOrbitNode,
        mesh: moonMesh,
        orbitLine: moonOrbitLine,
      });
    });

    planetsList.push({
      def,
      orbitNode,
      tiltNode,
      planetMesh,
      orbitLine,
      ringsMesh,
      moons: moonsList,
    });
  });

  return planetsList;
}

export function updateAllOrbitLineGeometries(planets: PlanetObject[], scientificScale: boolean) {
  planets.forEach((p) => {
    const def = p.def;
    const segs = 128, pts: THREE.Vector3[] = [];
    const Om_rad = THREE.MathUtils.degToRad(def.Omega_deg);
    const i_rad = THREE.MathUtils.degToRad(def.i_deg);
    const om_rad = THREE.MathUtils.degToRad(def.omega_deg);

    for (let s = 0; s <= segs; s++) {
      const E = (s / segs) * Math.PI * 2;
      const nu = 2 * Math.atan2(Math.sqrt(1 + def.e) * Math.sin(E / 2), Math.sqrt(1 - def.e) * Math.cos(E / 2));
      const r_AU = def.a_AU * (1 - def.e * Math.cos(E));
      const r_scaled = getScaledOrbitRadius(r_AU, scientificScale);
      const u = om_rad + nu;
      const x = r_scaled * (Math.cos(Om_rad) * Math.cos(u) - Math.sin(Om_rad) * Math.sin(u) * Math.cos(i_rad));
      const y = r_scaled * (Math.sin(u) * Math.sin(i_rad));
      const z = r_scaled * (Math.sin(Om_rad) * Math.cos(u) + Math.cos(Om_rad) * Math.sin(u) * Math.cos(i_rad));
      pts.push(new THREE.Vector3(x, y, z));
    }
    p.orbitLine.geometry.setFromPoints(pts);
  });
}

export function updateSolarSystemPhysics(
  planets: PlanetObject[],
  curDate: Date,
  simDays: number,
  scientificScale: boolean
) {
  planets.forEach((p) => {
    const def = p.def;
    const { pos } = computeHeliocentricPosition(def, curDate, scientificScale);
    p.orbitNode.position.copy(pos);

    // Rotación axial real (en horas)
    const rotDays = def.rot_period_hours / 24.0;
    p.planetMesh.rotation.y = (simDays / rotDays) * Math.PI * 2;

    // Traslación y rotación síncrona de sus satélites
    p.moons.forEach((m) => {
      const period = m.def.periodDays || m.def.orbitPeriodDays || 1;
      const moonAngle = (simDays / period) * Math.PI * 2;
      m.mesh.position.set(
        Math.cos(moonAngle) * m.def.orbitRadius,
        0,
        Math.sin(moonAngle) * m.def.orbitRadius
      );
      m.mesh.rotation.y = moonAngle;
    });
  });
}

