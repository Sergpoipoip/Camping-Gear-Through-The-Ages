/* Map page logic – Leaflet + static coordinate dictionary
   ------------------------------------------------------- */

(async function () {
  /* 1. bootstrap the map */
  // keep the user inside one world and one set of tiles
  const map = L.map('map', { worldCopyJump:false });
  const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom:10, noWrap:true,
        bounds:[[-85,-180],[85,180]],
        attribution:'&copy; OpenStreetMap contributors' }
  ).addTo(map);

  /* ---------- ensure ONE world fits the visible width --------------- */
  const calcMinZoom = () => {
      const pxWide  = map.getSize().x;
      // world pixel width at zoom z = 256 × 2^z
      let z = 2;
      while (256 * Math.pow(2, z) < pxWide && z < 10) z++;
      return z;
  };

  const initialZoom = calcMinZoom();
  map.setView([20,0], initialZoom);
  map.setMinZoom(initialZoom);                 // user can’t zoom out further
  map.setMaxBounds([[-85,-180],[85,180]]);     // but can still pan freely

  /* Adapt min-zoom on window resize so grey bars never appear */
  window.addEventListener('resize', () => {
      const z = calcMinZoom();
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setZoom(z);
  });

  /* coloured icons */
  function colouredIcon(color) {
    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize:[41,41]
    });
  }
  const iconOrig = colouredIcon('orange');   // original location
  const iconCurr = colouredIcon('blue');     // present museum

  /* 2. static coords & museum URLs --------------------------------------
     (one entry per UNIQUE place string appearing in items.json)          */
  const PLACES = {
    //  Prehistoric & ancient
    "Ishango, DR Congo, Africa":               { lat: 1.466,  lng: 29.200 },
    "Royal Belgian Institute of Royal Sciences, Brussels, Belgia":
                                              { lat: 50.843, lng: 4.358, url:"https://www.naturalsciences.be" },
    "Library of Ashurbanipal, Nineveh, Neo-Assyrian Empire":
                                              { lat: 36.363, lng: 43.154 },
    "The British Museum, London, United Kingdom":
                                              { lat: 51.519, lng:-0.126 , url:"https://www.britishmuseum.org" },
    "Uruk, Sumer, Mesopotomia":                { lat: 31.322, lng: 45.636 },
    "Regional Archaeological Museum Antonio Salinas, Palermo, Italy":
                                              { lat: 38.121, lng: 13.356, url:"https://www.regione.sicilia.it/beniculturali" },
    "Yinxu (modern Anyang, Henan), the Shang capital":
                                              { lat: 36.133, lng: 114.350 },
    "National Museum of China, Beijing, China":
                                              { lat: 39.904, lng: 116.397, url:"https://en.chnmuseum.cn" },
    "Mycenae, Peloponnese, Greece":           { lat: 37.731, lng: 22.754 },
    "National Archaeological Museum, Athens, Greece":
                                              { lat: 37.989, lng: 23.731, url:"https://www.namuseum.gr/en" },
    "Byblos, Phoenicia":                       { lat: 34.120, lng: 35.650 },
    "National Museum of Beirut, Lebanon":      { lat: 33.886, lng: 35.514, url:"https://beirutnationalmuseum.com" },
    "Temple complex near Sais, western Nile Delta, Egypt":
                                              { lat: 30.953, lng: 30.781 },
    // ... continue other unique strings ...
    "Archaeological Museum of Thessaloniki, Greece":
                                              { lat: 40.626, lng: 22.955, url:"https://www.amth.gr/en" },
    "St Catherine’s Monastery, Sinai, Egypt":  { lat: 28.556, lng: 33.976, url:"https://www.sinaimonastery.com" },
    "British Library, London, United Kingdom": { lat: 51.530, lng:-0.126, url:"https://www.bl.uk" },
    "National Library of France, Paris":       { lat: 48.833, lng: 2.375, url:"https://www.bnf.fr" },
    "Henry Ford Museum of American Innovation, Dearborn MI, USA":
                                              { lat: 42.304, lng:-83.232, url:"https://www.thehenryford.org" },
    "National Museum of American History, Washington, USA":
                                              { lat: 38.891, lng:-77.026, url:"https://americanhistory.si.edu" }
  };

  /* 3. fetch items & plot */
  const items = (await fetch('items.json').then(r => r.json())).items;

  items.forEach(it => {
    const {shortName} = it;

    [ {place:it.info["Original Location"],  icon:iconOrig,  label:"Original site"},
      {place:it.info["Housed in"],          icon:iconCurr, label:"Current museum"} ]
    .forEach(cfg => {
        const entry = PLACES[cfg.place];
        if (!entry) { console.warn('Missing coords for', cfg.place); return; }

        const popup = `
            <strong>${shortName}</strong><br>
            ${cfg.label}:<br>
            <em>${cfg.place}</em><br>
            ${entry.url ? `<a href="${entry.url}" target="_blank">Museum website&nbsp;&raquo;</a>` : ''}`;

        L.marker([entry.lat, entry.lng],{icon:cfg.icon})
          .bindPopup(popup,{minWidth:200})
          .addTo(map);
    });
  });

  /* 4. tiny legend */
  const legend = L.control({position:'topright'});
  legend.onAdd = function(){
     const div = L.DomUtil.create('div','legend shadow');
     div.innerHTML = `<span class="orig"></span>Original&nbsp;&nbsp;
                      <span class="curr"></span>Current`;
     return div;
  };
  legend.addTo(map);
})();