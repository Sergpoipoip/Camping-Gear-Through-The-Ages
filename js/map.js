/*  js/map.js  -----------------------------------------------------------
    Leaflet map with marker clustering, place-name fuzziness and
    hyperlinks from each popup to items.html?sid=<@sort>.
    Works with items.json in the project root.
---------------------------------------------------------------------------*/
(async function () {

  /* ────────────── 1 · MAP + BASE LAYER ───────────── */
  const map     = L.map('map', { worldCopyJump: false });
  const cluster = L.markerClusterGroup({ spiderfyOnMaxZoom: true });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom : 10,
      noWrap  : true,
      bounds  : [[-85, -180], [85, 180]],
      attribution : '&copy; OpenStreetMap contributors'
  }).addTo(map);

  /* ensure exactly one world fits horizontally (no grey bars) */
  function calcMinZoom () {
    const px = map.getSize().x;          // map width in pixels
    let z = 2;                           // world is 256 px at z=0
    while (256 * 2 ** z < px && z < 10) z++;
    return z;
  }
  const minZ = calcMinZoom();
  map.setView([20, 0], minZ);
  map.setMinZoom(minZ);
  map.setMaxBounds([[-85, -180], [85, 180]]);
  window.addEventListener('resize', () => {
    const z = calcMinZoom();
    map.setMinZoom(z);
    if (map.getZoom() < z) map.setZoom(z);
  });

  /* ────────────── 2 · ICONS ───────────────────────── */
  const icon = colour => L.icon({
    iconUrl   : `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colour}.png`,
    iconSize  : [25, 41],
    iconAnchor: [12, 41],
    popupAnchor:[1, -34],
    shadowUrl : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });
  const ICON_ORIG = icon('orange');   // original site
  const ICON_CURR = icon('blue');     // current museum

  /* ────────────── 3 · CO-ORD DICTIONARY ───────────── */
  /* One entry for every distinct place string occurring in items.json.
     (You can add more without touching the code.)                        */
  const PLACES = {
    /* Prehistoric & Ancient */
    "Ishango, DR Congo, Africa":                    {lat:  1.466, lng: 29.200},
    "Royal Belgian Institute of Royal Sciences, Brussels, Belgia":
                                                    {lat: 50.843, lng:  4.358, url:"https://www.naturalsciences.be"},
    "Library of Ashurbanipal, Nineveh, Neo-Assyrian Empire":
                                                    {lat: 36.363, lng: 43.154},
    "Uruk, Sumer, Mesopotomia":                     {lat: 31.322, lng: 45.636},
    "The British Museum, London, United Kingdom":   {lat: 51.519, lng:-0.126, url:"https://www.britishmuseum.org"},
    "Regional Archaeological Museum Antonio Salinas, Palermo, Italy":
                                                    {lat: 38.121, lng: 13.356, url:"https://www.regione.sicilia.it/beniculturali"},
    "Yinxu (modern Anyang, Henan), the Shang capital":
                                                    {lat: 36.133, lng:114.350},
    "National Museum of China, Beijing, China":     {lat: 39.904, lng:116.397, url:"https://en.chnmuseum.cn"},
    "Mycenae, Peloponnese, Greece":                 {lat: 37.731, lng: 22.754},
    "National Archaeological Museum, Athens, Greece":
                                                    {lat: 37.989, lng: 23.731, url:"https://www.namuseum.gr/en"},
    "Byblos, Phoenicia":                            {lat: 34.120, lng: 35.650},
    "National Museum of Beirut, Lebanon":           {lat: 33.886, lng: 35.514, url:"https://beirutnationalmuseum.com"},
    "Temple complex near Sais, western Nile Delta, Egypt":
                                                    {lat: 30.953, lng: 30.781},

    /* Mediaeval & early-modern */
    "Archaeological Museum of Thessaloniki, Greece":{lat: 40.626, lng: 22.955, url:"https://www.amth.gr/en"},
    "British Library, London, United Kingdom":      {lat: 51.530, lng:-0.126, url:"https://www.bl.uk"},
    "National Library of France, Paris":            {lat: 48.833, lng:  2.375, url:"https://www.bnf.fr"},

    /* Modern */
    "Henry Ford Museum of American Innovation, Dearborn MI, USA":
                                                    {lat: 42.304, lng:-83.232, url:"https://www.thehenryford.org"},
    "National Museum of American History, Washington, USA":
                                                    {lat: 38.891, lng:-77.026, url:"https://americanhistory.si.edu"},

    /* Extra originals / variants requested by the user */
    "Memphis, Egypt":                               {lat: 29.8447,lng: 31.2508},
    "Likely Memphis or Heliopolis":                 {lat: 29.8447,lng: 31.2508},
    "Temple complex near Sais, Egypt":              {lat: 30.9806,lng: 30.7861},
    "Thessaloniki, Greece":                         {lat: 40.6401,lng: 22.9444},
    "Dunghuang, China":                             {lat: 40.1421,lng: 94.6610},
    "Dunhuang, China":                              {lat: 40.1421,lng: 94.6610},
    "Cheongju, South Korea":                        {lat: 36.6372,lng:127.4892},
    "Mainz, Germany":                               {lat: 49.9923,lng:  8.2473},
    "Mainz, Holy Roman Empire, Germany":            {lat: 49.9923,lng:  8.2473},
    "Ilion, New York, USA":                         {lat: 42.9855,lng:-75.0363},
    "Washington, USA":                              {lat: 38.9072,lng:-77.0373},
    "Mountain View, CA, USA":                       {lat: 37.3861,lng:-122.0839},

    /* Split Codex-Sinaiticus holdings */
    "St Catherine’s Monastery, Sinai, Egypt":       {lat: 28.556, lng: 33.976, url:"https://www.sinaimonastery.com"},
    "Leipzig University Library, Germany":          {lat: 51.3402,lng: 12.3748, url:"https://www.ub.uni-leipzig.de"},
    "National Library of Russia, St Petersburg":    {lat: 59.9398,lng: 30.3157, url:"https://nlr.ru"},

    /* Short forms that appear inside longer strings */
    "The British Library":                          {lat: 51.530, lng:-0.126, url:"https://www.bl.uk"},
    "National Library of France":             {lat: 48.833, lng:  2.375, url:"https://www.bnf.fr"}
  };

  /* ────────────── 4 · NORMALISED LOOK-UP ─────────── */
  const norm = s => s.replace(/\u202f|\u00a0/g, ' ')
                     .replace(/\s+/g, ' ')
                     .toLowerCase().trim();

  const NORM_PLACES = Object.fromEntries(
    Object.entries(PLACES).map(([k, v]) => [norm(k), v])
  );

  /* Resolve free-text field → array of coords objects */
  function resolvePlaces(raw) {
    if (!raw || raw === '-') return [];
    raw = raw.replace(/[…]/g, '');

    return raw.split(';').flatMap(seg => {
      seg = seg.trim();
      if (!seg) return [];

      seg = seg.replace(/^[0-9]+[^,]*,\s*/, '').trim();      // drop leading counts
      const n = norm(seg);
      if (NORM_PLACES[n]) return [NORM_PLACES[n]];

      const hit = Object.keys(NORM_PLACES).find(k => n.includes(k) || k.includes(n));
      return hit ? [NORM_PLACES[hit]] : [];
    });
  }

  /* ────────────── 5 · FETCH DATA & PLOT ───────────── */
  const items = (await fetch('items.json').then(r => r.json())).items;

  items.forEach(it => {
    const pairs = [
      { field: it.info["Original Location"], icon: ICON_ORIG, label: "Original site" },
      { field: it.info["Housed in"],         icon: ICON_CURR, label: "Current museum" }
    ];

    pairs.forEach(cfg => {
      resolvePlaces(cfg.field).forEach(entry => {

        /* Build hyperlink: items.html?sid=<@sort> so items.js pops the modal automatically */
        const link = `<a href="items.html?sid=${encodeURIComponent(it['@sort'])}">${it.shortName}</a>`;

        const popup = `
          <strong>${link}</strong><br>
          ${cfg.label}<br>
          <em>${cfg.field}</em><br>
          ${entry.url ? `<a href="${entry.url}" target="_blank">Museum website&nbsp;&raquo;</a>` : ''}`;

        L.marker([entry.lat, entry.lng], { icon: cfg.icon })
         .bindPopup(popup, { minWidth: 220 })
         .addTo(cluster);
      });
    });
  });

  map.addLayer(cluster);

  /* ────────────── 6 · LEGEND ──────────────────────── */
  L.control({position:'topright'}).onAdd = () => {
    const d = L.DomUtil.create('div', 'legend shadow');
    d.innerHTML =
      `<span style="display:inline-block;width:14px;height:14px;background:#ff5722;border-radius:50%;margin-right:6px"></span>Original&nbsp;&nbsp;
       <span style="display:inline-block;width:14px;height:14px;background:#0077ff;border-radius:50%;margin-right:6px"></span>Current`;
    return d;
  };addTo(map);

})();
