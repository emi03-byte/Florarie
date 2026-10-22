/** Em dash used in catalog names: "Centro redondo — Clavel rosa". */
export const NAME_SEP = ' — ';

/** Color words that can trail a flower name or stand alone as a variant. */
const COLOR =
  'rojas?|rojos?|blancas?|blancos?|amarillas?|amarillos?|naranjas?|verdes?|fucsias?|rosas?|jaspeados?|jaspeadas?|aqua|colorido';

/**
 * Flower heads that mark the start of a variant (or counted block).
 * New models keep working as long as the trailing variant uses these patterns.
 */
const FLOWER = 'rosas?|clavel|lilium|gerbera|margaritas?';

/**
 * Normalize Admin free-text into catalog style "Model — Variant".
 * Model-agnostic: works for Centro…, future names, with or without hyphens/spaces.
 *
 *   "cualquier modelo 13 rosas blancas"  → "Cualquier modelo 13 rosas — Rosas blancas"
 *   "modelo 13- rosas blancas"           → same shape
 *   "modelo — clavel rosa"               → "Modelo — Clavel rosa"
 *   "modelo flor variada rojo"           → "Modelo flor variada — Rojo"
 */
function preNormalize(raw: string): string {
  let s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return s;

  s = s.replace(/\bnaraja(s)?\b/gi, (_m, pl) => (pl ? 'naranjas' : 'naranja'));

  // "modelo13" / "13rosas" → spaces around digits next to letters
  s = s.replace(/([a-záéíóúüñ])(\d)/gi, '$1 $2');
  s = s.replace(/(\d)([a-záéíóúüñ])/gi, '$1 $2');

  // "13- rosas" / "13—clavel" → not a model/variant split; treat as space
  s = s.replace(
    new RegExp(`(\\d)\\s*[—–-]\\s*(?=(?:${FLOWER}|flor)\\b)`, 'gi'),
    '$1 ',
  );

  return s.replace(/\s+/g, ' ').trim();
}

export function formatBouquetDisplayName(raw: string): string {
  let name = preNormalize(raw);
  if (!name) return name;

  // Explicit separator (em/en dash or hyphen), any spacing.
  const sepMatch = name.match(/\s*[—–-]\s*/);
  if (sepMatch && sepMatch.index != null && sepMatch.index > 0) {
    let modelPart = name.slice(0, sepMatch.index).trim();
    let variantPart = name.slice(sepMatch.index + sepMatch[0].length).trim();

    // "… 13 — rosas blancas" → flower belongs on the model
    const flowerLead = variantPart.match(
      new RegExp(`^(${FLOWER})\\s+(.+)$`, 'i'),
    );
    if (flowerLead && /\b\d+$/.test(modelPart)) {
      modelPart = `${modelPart} ${flowerLead[1].toLowerCase()}`;
      variantPart = flowerLead[2].trim();
    }

    // "… 13 — blancas" → assume counted rosas when color is alone after a number
    if (
      /\b\d+$/.test(modelPart) &&
      new RegExp(`^(?:${COLOR})$`, 'i').test(variantPart)
    ) {
      modelPart = `${modelPart} rosas`;
    }

    const model = titleModel(modelPart);
    let variant = normalizeVariant(titleVariant(variantPart));
    variant = expandBareColorVariant(model, variant);
    return variant ? `${model}${NAME_SEP}${variant}` : model;
  }

  // "… Clavel rosa"
  const clavel = name.match(
    new RegExp(`^(.+?)\\s+(clavel\\s+(?:${COLOR}))$`, 'i'),
  );
  if (clavel) {
    return `${titleModel(clavel[1])}${NAME_SEP}${titleVariant(clavel[2])}`;
  }

  // "… 18 rosas rojas" → model keeps "N rosas", variant = Rosas + color
  const counted = name.match(
    new RegExp(`^(.+?\\b\\d+\\s+rosas?)\\s+(${COLOR})$`, 'i'),
  );
  if (counted) {
    const model = titleModel(counted[1]);
    const color = counted[2].toLowerCase();
    const plural = /\brosas\b/i.test(counted[1]);
    const flower = plural ? 'Rosas' : 'Rosa';
    return `${model}${NAME_SEP}${flower} ${agreeColorWord(color, plural)}`;
  }

  // "… 13 blancas" (forgot "rosas")
  const countedBare = name.match(
    new RegExp(`^(.+?\\b\\d+)\\s+(${COLOR})$`, 'i'),
  );
  if (countedBare) {
    const model = titleModel(`${countedBare[1]} rosas`);
    const color = countedBare[2].toLowerCase();
    return `${model}${NAME_SEP}Rosas ${agreeColorWord(color, true)}`;
  }

  // "… rosas rojas" (no number, or number already in model text elsewhere)
  const rosas = name.match(
    new RegExp(`^(.+?)\\s+(rosas?\\s+(?:${COLOR}))$`, 'i'),
  );
  if (rosas) {
    return `${titleModel(rosas[1])}${NAME_SEP}${normalizeVariant(titleVariant(rosas[2]))}`;
  }

  // "… flor variada blanco/rojo/…"
  const florVar = name.match(
    /^(.*?flor variada)\s+(rosa|roja|rojo|blanca|blanco|colorido)$/i,
  );
  if (florVar) {
    return `${titleModel(florVar[1])}${NAME_SEP}${titleVariant(florVar[2])}`;
  }

  // Single trailing color word
  const trailing = name.match(
    new RegExp(
      `^(.+?)\\s+(rosa|roja|rojo|blanca|blanco|colorido|fucsia|amarilla|amarillo|naranja|naranjas)$`,
      'i',
    ),
  );
  if (trailing) {
    return `${titleModel(trailing[1])}${NAME_SEP}${titleVariant(trailing[2])}`;
  }

  return titleModel(name);
}

/** "Rosa amarillas" → "Rosas amarillas" when the color is clearly plural. */
function normalizeVariant(variant: string): string {
  const m = variant.match(/^Rosa\s+(.+)$/i);
  if (!m) return variant;
  const color = m[1].toLowerCase();
  if (
    /^(rojas|blancas|amarillas|naranjas|verdes|fucsias|rosas|jaspeadas)$/.test(
      color,
    )
  ) {
    return `Rosas ${color}`;
  }
  return variant;
}

/** If model ends with "N rosas" and variant is only a color, prefix with Rosas/Rosa. */
function expandBareColorVariant(model: string, variant: string): string {
  if (!variant) return variant;
  if (!new RegExp(`^(?:${COLOR})$`, 'i').test(variant)) return variant;
  if (!/\b\d+\s+rosas?\b/i.test(model)) return variant;
  const plural = /\brosas\b/i.test(model);
  const flower = plural ? 'Rosas' : 'Rosa';
  return `${flower} ${agreeColorWord(variant.toLowerCase(), plural)}`;
}

/**
 * Split a catalog name into model + variant for De făcut grouping.
 * Always normalizes first so "typed as-is" names still group with formatted ones.
 */
export function parseBouquetName(raw: string): { model: string; variant: string } {
  const formatted = formatBouquetDisplayName(raw);
  const idx = formatted.indexOf(NAME_SEP);
  if (idx === -1) {
    return { model: formatted, variant: formatted };
  }
  const model = formatted.slice(0, idx).trim();
  const variant = formatted.slice(idx + NAME_SEP.length).trim() || formatted;
  return { model, variant };
}

/**
 * Stable group key for a model label.
 * Aliases (cara / de cara) and spacing land on the same key so variants group together.
 */
export function modelGroupKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bcentro de cara\b/g, 'centro cara');
}

/**
 * Prefer a clearer display label when merging groups
 * (e.g. "Centro de cara" over "Centro cara").
 */
export function preferModelLabel(current: string, incoming: string): string {
  if (modelGroupKey(current) !== modelGroupKey(incoming)) return current;
  const curDe = /\bde cara\b/i.test(current);
  const inDe = /\bde cara\b/i.test(incoming);
  if (inDe && !curDe) return incoming;
  if (curDe && !inDe) return current;
  return incoming.length > current.length ? incoming : current;
}

/** Title-case first word; keep "Centro …" catalog style when present. */
function titleModel(s: string): string {
  const lower = s.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!lower) return lower;
  if (/^centro\b/.test(lower)) {
    return `Centro${lower.slice('centro'.length)}`;
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleVariant(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  const parts = t.split(' ');
  return parts
    .map((p, i) => {
      const lower = p.toLowerCase();
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(' ');
}

function agreeColorWord(color: string, pluralFlower: boolean): string {
  const c = color.toLowerCase();
  if (c === 'fucsia' || c === 'fucsias' || c === 'aqua' || c === 'colorido') {
    return c === 'fucsias' ? 'fucsia' : c;
  }
  const stem =
    /blanc/.test(c)
      ? 'blanc'
      : /roj/.test(c)
        ? 'roj'
        : /amarill/.test(c)
          ? 'amarill'
          : /naranja/.test(c)
            ? 'naranja'
            : /verd/.test(c)
              ? 'verd'
              : /jaspead/.test(c)
                ? 'jaspead'
                : /rosa/.test(c)
                  ? 'rosa'
                  : null;
  if (!stem) return c;
  if (stem === 'naranja') return pluralFlower ? 'naranjas' : 'naranja';
  if (stem === 'rosa') return pluralFlower ? 'rosas' : 'rosa';
  if (stem === 'verd') return pluralFlower ? 'verdes' : 'verde';
  if (stem === 'blanc') return pluralFlower ? 'blancas' : 'blanca';
  if (stem === 'roj') return pluralFlower ? 'rojas' : 'roja';
  if (stem === 'amarill') return pluralFlower ? 'amarillas' : 'amarilla';
  if (stem === 'jaspead') return pluralFlower ? 'jaspeadas' : 'jaspeada';
  return c;
}
