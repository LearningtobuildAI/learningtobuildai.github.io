/* Shared publication policy. A plausible URL or a model's verdict is not verification. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SiteEvidence = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  const fields = ['id', 'name', 'what', 'how', 'stage', 'use', 'companies', 'cost', 'eff', 'techLevel', 'type', 'link', 'source', 'pubDate'];
  function content(t) {
    const out = {};
    fields.forEach(k => { if (t[k] !== undefined) out[k] = t[k]; });
    return out;
  }
  function key(src, t) { return src.split('?')[0].replace(/^\//, '') + '#' + t.id; }
  function reviewed(t, src, registry) {
    const r = registry && registry.entries && registry.entries[key(src, t)];
    if (!r || r.status !== 'reviewed' || !r.checkedAt || !r.sources || !r.sources.length) return null;
    if (JSON.stringify(content(t)) !== JSON.stringify(r.content)) return null;
    if (!r.sources.every(s => s.url && /^https:\/\//.test(s.url) && s.supports)) return null;
    // Every displayed company must have specific evidence of its role in this technology.
    if (!(t.companies || []).every(c => r.sources.some(s => (s.companies || []).includes(c)))) return null;
    return r;
  }
  function apply(t, src, registry) {
    const r = reviewed(t, src, registry);
    return Object.assign({}, t, {
      evidenceStatus: r ? 'reviewed' : 'unverified',
      evidenceSources: r ? r.sources : [],
      evidenceCheckedAt: r ? r.checkedAt : null,
      explainer: r && r.video && r.video.status === 'reviewed' ? r.video : null,
      companies: r ? (t.companies || []) : [],
    });
  }
  let pending;
  function load() {
    if (!pending) pending = fetch('/website/evidence-registry.json').then(r => {
      if (!r.ok) throw new Error('Evidence registry unavailable');
      return r.json();
    }).catch(() => ({ entries: {} }));
    return pending;
  }
  return { content, key, reviewed, apply, load };
});
