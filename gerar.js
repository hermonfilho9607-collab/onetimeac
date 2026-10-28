// Gera um site a partir de um JSON de cliente.
// Uso: node gerar.js clientes/nome-do-cliente.json
const fs = require('fs');
const path = require('path');

const ICONS = {
  snowflake: '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9M9 3l3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 2-3 4-3 6-1-1-2-2-2.5-4C6.5 9.5 5 12 5 15c0 4.3 3 7 7 7z"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 2 4l-4 4M14 12c4 0 7 1 7 4 0 2-2 3-4 2l-4-4M12 14c0 4-1 7-4 7-2 0-3-2-2-4l4-4M10 12c-4 0-7-1-7-4 0-2 2-3 4-2l4 4"/>',
  split: '<rect x="2" y="5" width="20" height="8" rx="2"/><path d="M6 10h12M7 17l-1 3M12 17v3M17 17l1 3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 6.7-6.7a4 4 0 0 1-5-5L10 5l4-2z"/><path d="M3 21l6-6"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  thumb: '<path d="M7 11v10H3V11zM7 11l4-8a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
};
const svg = name => {
  const body = ICONS[name] || ICONS.check;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
};

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lookup(key, stack) {
  if (key === '.') return stack[stack.length - 1]['.'];
  const parts = key.split('.');
  for (let i = stack.length - 1; i >= 0; i--) {
    let v = stack[i];
    if (v == null || typeof v !== 'object' || !(parts[0] in v)) continue;
    for (const p of parts) v = v == null ? undefined : v[p];
    return v;
  }
  return undefined;
}

// Mini-mustache: {{var}} escapado, {{{var}}} cru, {{#x}}…{{/x}} seção/loop, {{^x}}…{{/x}} inverso.
function render(tpl, stack) {
  tpl = tpl.replace(/{{([#^])\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\2\s*}}/g, (m, type, key, inner) => {
    const v = lookup(key, stack);
    const empty = !v || (Array.isArray(v) && !v.length);
    if (type === '^') return empty ? render(inner, stack) : '';
    if (empty) return '';
    if (Array.isArray(v)) return v.map(item => render(inner, [...stack, typeof item === 'object' ? item : { '.': item }])).join('');
    if (typeof v === 'object') return render(inner, [...stack, v]);
    return render(inner, stack);
  });
  return tpl.replace(/{{{\s*([\w.]+)\s*}}}|{{\s*([\w.]+)\s*}}/g, (m, raw, key) => {
    const v = lookup(raw || key, stack);
    if (v == null) return '';
    return raw ? String(v) : esc(String(v));
  });
}

const file = process.argv[2];
if (!file) {
  console.error('Uso: node gerar.js clientes/nome-do-cliente.json');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const required = ['business_name', 'phone', 'city', 'state', 'services'];
const missing = required.filter(k => !data[k]);
if (missing.length) {
  console.error('Faltando no JSON: ' + missing.join(', '));
  process.exit(1);
}

// Campos calculados
const digits = data.phone.replace(/\D/g, '');
data.phone_link = '+' + (digits.length === 10 ? '1' + digits : digits);
data.year = new Date().getFullYear();
data.icons = Object.fromEntries(Object.keys(ICONS).map(k => [k, svg(k)]));
for (const s of data.services) s.icon_svg = svg(s.icon);
for (const w of data.why || []) w.icon_svg = svg(w.icon);
for (const r of data.reviews || []) {
  r.stars = r.stars || 5;
  r.stars_str = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
  r.initial = (r.name || '?').trim()[0].toUpperCase();
}
data.areas_footer = (data.areas || []).slice(0, 8);
data.seo = data.seo || {};
data.seo.url = data.website_url || '';
data.form_action = data.form_action || '#';
data.phone_label = data.phone_label || 'Call Now';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'HVACBusiness',
  name: data.business_name,
  telephone: data.phone,
  email: data.email || undefined,
  url: data.website_url || undefined,
  address: { '@type': 'PostalAddress', streetAddress: data.address, addressLocality: data.city, addressRegion: data.state },
  areaServed: data.areas,
  openingHours: data.hours,
  aggregateRating: data.rating && data.rating.count
    ? { '@type': 'AggregateRating', ratingValue: data.rating.value, reviewCount: data.rating.count }
    : undefined,
};
data.schema_json = JSON.stringify(schema).replace(/</g, '\\u003c');

const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const html = render(tpl, [data]);

const slug = data.slug || data.business_name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
const outDir = path.join(__dirname, 'saida', slug);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);

const leftovers = html.match(/{{[^}]*}}/g);
if (leftovers) console.warn('Aviso: marcadores não substituídos:', [...new Set(leftovers)].join(', '));
console.log('Site gerado em: ' + path.relative(process.cwd(), path.join(outDir, 'index.html')));
