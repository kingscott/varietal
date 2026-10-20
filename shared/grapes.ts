/**
 * Grape catalog: Vivino grape IDs plus a typical drinking window, in years after
 * vintage, for a typical-quality bottle. Vivino IDs were derived from Vivino's
 * own single-varietal wines.
 */
export interface Grape {
  name: string
  vivinoIds: number[]
  aliases?: string[]
  window: [start: number, end: number]
  style: string
}

const FULL_RED = 'Full-bodied red'
const MED_RED = 'Medium-bodied red'
const LIGHT_RED = 'Light-bodied red'
const RICH_WHITE = 'Rich white'
const CRISP_WHITE = 'Crisp white'
const AROMATIC_WHITE = 'Aromatic white'

export const GRAPES: Grape[] = [
  { name: 'Cabernet Sauvignon', vivinoIds: [2], aliases: ['cab', 'cab sauv', 'cabernet'], window: [4, 15], style: FULL_RED },
  { name: 'Merlot', vivinoIds: [10], window: [3, 10], style: MED_RED },
  { name: 'Cabernet Franc', vivinoIds: [3], aliases: ['cab franc'], window: [3, 12], style: MED_RED },
  { name: 'Petit Verdot', vivinoIds: [42], window: [4, 12], style: FULL_RED },
  { name: 'Malbec', vivinoIds: [9], window: [2, 8], style: FULL_RED },
  { name: 'Carménère', vivinoIds: [51], window: [2, 7], style: MED_RED },
  { name: 'Pinot Noir', vivinoIds: [14], aliases: ['pinot', 'spätburgunder', 'spatburgunder'], window: [2, 8], style: LIGHT_RED },
  { name: 'Syrah', vivinoIds: [1], aliases: ['shiraz'], window: [3, 12], style: FULL_RED },
  { name: 'Grenache', vivinoIds: [8, 142, 101], aliases: ['garnacha', 'cannonau'], window: [2, 8], style: MED_RED },
  { name: 'Mourvèdre', vivinoIds: [22, 88], aliases: ['monastrell', 'mataro'], window: [4, 12], style: FULL_RED },
  { name: 'Carignan', vivinoIds: [41], aliases: ['cariñena', 'carignane'], window: [2, 8], style: MED_RED },
  { name: 'Cinsault', vivinoIds: [75], window: [1, 5], style: LIGHT_RED },
  { name: 'Zinfandel', vivinoIds: [21, 92], aliases: ['primitivo', 'zin'], window: [2, 7], style: FULL_RED },
  { name: 'Petite Sirah', vivinoIds: [25], aliases: ['durif'], window: [4, 14], style: FULL_RED },
  { name: 'Tempranillo', vivinoIds: [19, 69], aliases: ['tinta roriz', 'tinto fino', 'tinta de toro'], window: [3, 12], style: MED_RED },
  { name: 'Sangiovese', vivinoIds: [16], aliases: ['brunello'], window: [3, 10], style: MED_RED },
  { name: 'Nebbiolo', vivinoIds: [12], window: [7, 20], style: FULL_RED },
  { name: 'Barbera', vivinoIds: [31], window: [2, 7], style: MED_RED },
  { name: 'Dolcetto', vivinoIds: [37], window: [1, 4], style: LIGHT_RED },
  { name: 'Aglianico', vivinoIds: [97], window: [6, 18], style: FULL_RED },
  { name: 'Montepulciano', vivinoIds: [58], window: [2, 8], style: MED_RED },
  { name: 'Corvina', vivinoIds: [43, 271], window: [2, 8], style: MED_RED },
  { name: "Nero d'Avola", vivinoIds: [108], window: [2, 7], style: FULL_RED },
  { name: 'Gamay', vivinoIds: [80], window: [1, 5], style: LIGHT_RED },
  { name: 'Touriga Nacional', vivinoIds: [67], window: [4, 15], style: FULL_RED },
  { name: 'Touriga Franca', vivinoIds: [68], window: [3, 12], style: FULL_RED },
  { name: 'Pinotage', vivinoIds: [62], window: [2, 8], style: MED_RED },
  { name: 'Tannat', vivinoIds: [48], window: [4, 15], style: FULL_RED },
  { name: 'Mencía', vivinoIds: [385], window: [2, 7], style: MED_RED },
  { name: 'Blaufränkisch', vivinoIds: [221], aliases: ['lemberger'], window: [2, 10], style: MED_RED },
  { name: 'Xinomavro', vivinoIds: [255], window: [5, 15], style: MED_RED },
  { name: 'Nerello Mascalese', vivinoIds: [282], window: [3, 12], style: MED_RED },
  { name: 'Sagrantino', vivinoIds: [286], window: [6, 18], style: FULL_RED },
  { name: 'Lagrein', vivinoIds: [82], window: [2, 8], style: MED_RED },
  { name: 'Chardonnay', vivinoIds: [5], window: [1, 6], style: RICH_WHITE },
  { name: 'Sauvignon Blanc', vivinoIds: [17], aliases: ['sauv blanc', 'fumé blanc', 'fume blanc'], window: [0, 3], style: CRISP_WHITE },
  { name: 'Riesling', vivinoIds: [15], window: [2, 15], style: AROMATIC_WHITE },
  { name: 'Chenin Blanc', vivinoIds: [6], aliases: ['chenin', 'steen'], window: [2, 12], style: RICH_WHITE },
  { name: 'Sémillon', vivinoIds: [18], aliases: ['semillon'], window: [3, 15], style: RICH_WHITE },
  { name: 'Viognier', vivinoIds: [20], window: [1, 4], style: AROMATIC_WHITE },
  { name: 'Pinot Gris', vivinoIds: [13, 34], aliases: ['pinot grigio', 'grauburgunder'], window: [1, 5], style: CRISP_WHITE },
  { name: 'Gewürztraminer', vivinoIds: [7], aliases: ['gewurztraminer', 'traminer'], window: [1, 6], style: AROMATIC_WHITE },
  { name: 'Grüner Veltliner', vivinoIds: [233], aliases: ['gruner veltliner', 'gruner', 'grüner'], window: [1, 8], style: CRISP_WHITE },
  { name: 'Albariño', vivinoIds: [49], aliases: ['albarino', 'alvarinho'], window: [0, 4], style: CRISP_WHITE },
  { name: 'Marsanne', vivinoIds: [24], window: [2, 10], style: RICH_WHITE },
  { name: 'Roussanne', vivinoIds: [23], window: [2, 10], style: RICH_WHITE },
  { name: 'Muscat', vivinoIds: [11, 59], aliases: ['moscato', 'moscatel', 'muscat blanc'], window: [0, 3], style: AROMATIC_WHITE },
  { name: 'Garganega', vivinoIds: [104], window: [1, 6], style: CRISP_WHITE },
  { name: 'Vermentino', vivinoIds: [119], aliases: ['rolle'], window: [0, 3], style: CRISP_WHITE },
  { name: 'Verdejo', vivinoIds: [118], window: [0, 3], style: CRISP_WHITE },
  { name: 'Furmint', vivinoIds: [394], window: [2, 10], style: CRISP_WHITE },
  { name: 'Assyrtiko', vivinoIds: [259], window: [1, 8], style: CRISP_WHITE },
  { name: 'Torrontés', vivinoIds: [93], aliases: ['torrontes'], window: [0, 2], style: AROMATIC_WHITE },
  { name: 'Melon de Bourgogne', vivinoIds: [1670], aliases: ['melon', 'muscadet'], window: [0, 5], style: CRISP_WHITE },
  { name: 'Pinot Blanc', vivinoIds: [36], aliases: ['pinot bianco', 'weissburgunder'], window: [0, 4], style: CRISP_WHITE },
  { name: 'Trebbiano', vivinoIds: [55, 1551], aliases: ['ugni blanc'], window: [0, 3], style: CRISP_WHITE },
  { name: 'Fiano', vivinoIds: [103], window: [1, 7], style: RICH_WHITE },
  { name: 'Greco', vivinoIds: [231], window: [1, 6], style: CRISP_WHITE },
  { name: 'Godello', vivinoIds: [444], window: [1, 6], style: RICH_WHITE },
  { name: 'Glera', vivinoIds: [1697], aliases: ['prosecco'], window: [0, 2], style: CRISP_WHITE },
  { name: 'Aligoté', vivinoIds: [50], aliases: ['aligote'], window: [0, 4], style: CRISP_WHITE },
  { name: 'Arneis', vivinoIds: [29], window: [0, 3], style: CRISP_WHITE },
  { name: 'Cortese', vivinoIds: [77], window: [0, 3], style: CRISP_WHITE },
  { name: 'Friulano', vivinoIds: [314], window: [1, 4], style: CRISP_WHITE },
  { name: 'Viura', vivinoIds: [96], aliases: ['macabeo'], window: [1, 6], style: CRISP_WHITE },
  { name: 'Grenache Blanc', vivinoIds: [56], aliases: ['garnacha blanca'], window: [1, 4], style: RICH_WHITE },
  { name: 'Silvaner', vivinoIds: [252], aliases: ['sylvaner'], window: [1, 6], style: CRISP_WHITE },
  { name: 'Petit Manseng', vivinoIds: [284], window: [2, 10], style: AROMATIC_WHITE },
  { name: 'Palomino', vivinoIds: [38], window: [0, 3], style: 'Fortified' },
  { name: 'Pedro Ximénez', vivinoIds: [454], aliases: ['pedro ximenez', 'px'], window: [0, 10], style: 'Fortified' },
]

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const byVivinoId = new Map(GRAPES.flatMap((g) => g.vivinoIds.map((id) => [id, g] as const)))
const byName = new Map(
  GRAPES.flatMap((g) => [g.name, ...(g.aliases ?? [])].map((n) => [fold(n), g] as const)),
)

export function grapeByVivinoId(id: number): Grape | undefined {
  return byVivinoId.get(id)
}

export function findGrape(name: string): Grape | undefined {
  return byName.get(fold(name))
}

/** Map a user-entered grape name to its canonical spelling when known. */
export function canonicalGrapeName(name: string): string {
  return findGrape(name)?.name ?? name.trim()
}
