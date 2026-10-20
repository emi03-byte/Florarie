/** Em dash used in catalog names: "Centro redondo — Clavel rosa". */
export const NAME_SEP = ' — ';

const COLOR =
  'rojas?|rojos?|blancas?|blancos?|amarillas?|amarillos?|naranjas?|verdes?|fucsias?|rosas?|jaspeados?|jaspeadas?|aqua|colorido';

/**
 * Normalize Admin free-text into catalog style "Model — Variant".
 * Examples:
 *   "Centro redondo 18 rosas rojas" → "Centro redondo 18 rosas — Rosas rojas"
 *   "Centro redondo — Clavel rosa"  → unchanged (spacing/dash fixed)
 */
export function formatBouquetDisplayName(raw: string): string {
  let name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return name;

  // Already has a separator (em/en dash or " - ").
  const sepMatch = name.match(/\s+[—–-]\s+/);
  if (sepMatch && sepMatch.index != null) {
    const model = titleModel(name.slice(0, sepMatch.index).trim());
    const variant = titleVariant(name.slice(sepMatch.index + sepMatch[0].length).trim());
    return variant ? `${model}${NAME_SEP}${variant}` : model;
  }

  // "… Clavel rosa/rojo/…"
  const clavel = name.match(new RegExp(`^(centro\\b.+?)\\s+(clavel\\s+(?:${COLOR}))$`, 'i'));
  if (clavel) {
    return `${titleModel(clavel[1])}${NAME_SEP}${titleVariant(clavel[2])}`;
  }

  // "… 18 rosas rojas" / "… 12 rosas blancas" → model keeps count, variant = Rosas + color
  const counted = name.match(
    new RegExp(`^(centro\\b.+?\\b\\d+\\s+rosas?)\\s+(${COLOR})$`, 'i'),
  );
  if (counted) {
    const model = titleModel(counted[1]);
    const color = counted[2].toLowerCase();
    const plural = /\brosas\b/i.test(counted[1]);
    const flower = plural ? 'Rosas' : 'Rosa';
    return `${model}${NAME_SEP}${flower} ${agreeColorWord(color, plural)}`;
  }

  // "… rosas rojas" without number in the split (whole phrase ends with flower+color)
  const rosas = name.match(new RegExp(`^(centro\\b.+?)\\s+(rosas?\\s+(?:${COLOR}))$`, 'i'));
  if (rosas) {
    return `${titleModel(rosas[1])}${NAME_SEP}${titleVariant(rosas[2])}`;
  }

  // Flor variada color-only: "… flor variada blanco"
  const florVar = name.match(
    /^(centro\b.+?\bflor variada)\s+(rosa|roja|rojo|blanca|blanco|colorido)$/i,
  );
  if (florVar) {
    return `${titleModel(florVar[1])}${NAME_SEP}${titleVariant(florVar[2])}`;
  }

  // Single trailing color after a Centro model
  const trailing = name.match(
    /^(centro\b.+?)\s+(rosa|roja|rojo|blanca|blanco|colorido|fucsia)$/i,
  );
  if (trailing) {
    return `${titleModel(trailing[1])}${NAME_SEP}${titleVariant(trailing[2])}`;
  }

  return titleModel(name);
}

/** Catalog style: "Centro redondo", "Centro de cara", "Centro ovalado 18 rosas". */
function titleModel(s: string): string {
  const lower = s.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!lower) return lower;
  // Keep "Centro" capitalized; leave the rest lowercase (matches existing names).
  if (/^centro\b/.test(lower)) {
    return `Centro${lower.slice('centro'.length)}`;
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleVariant(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  // Keep Spanish flower names natural: first word capital, rest lower (colors).
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
  // Map any gender/number form to feminine plural/singular to match catalog (rosas).
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
