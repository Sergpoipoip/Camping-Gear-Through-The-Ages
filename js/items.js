/*  js/items.js  ---------------------------------------------------------
   Builds the gallery, supports filter dropdowns, lazy-loads “Full story”
   HTML, and starts with either a narrative or a typology pre-selected
   (picked up from ?narrative=… / ?typology=… or sessionStorage).
*/
(() => {
  /* ---------- State & DOM ---------- */
  let items     = [];
  let filtered  = [];

  const themeSel    = document.getElementById('filterTheme');
  const typologySel = document.getElementById('filterTypology');
  const periodSel   = document.getElementById('filterPeriod');
  const grid        = document.getElementById('itemsGrid');

  // Modal parts
  const modalEl   = document.getElementById('itemModal');
  const modal     = bootstrap.Modal.getOrCreateInstance(modalEl);
  const longerDiv = document.getElementById('modalLongerInfo');
  const fullDiv   = document.getElementById('modalFullInfo');
  const btnLonger = document.getElementById('btnShowLonger');
  const btnFull   = document.getElementById('btnShowFull');

  /* ---------- Query-string / sessionStorage ---------- */
  const params         = new URLSearchParams(location.search);
  const startNarrative = params.get('narrative') || sessionStorage.getItem('narrative') || '';
  const preTypology    = params.get('typology')  || sessionStorage.getItem('typology')  || '';
  const startPeriod    = params.get('period')    || sessionStorage.getItem('period')    || '';
  const startSid       = params.get('sid') || '';


  // clean out session copies so back-navigation doesn’t re-apply filters
  sessionStorage.removeItem('narrative');
  sessionStorage.removeItem('typology');
  sessionStorage.removeItem('period');

  /* ---------- Load dataset ---------- */
  fetch('items.json')
    .then(r => r.json())
    .then(data => {
      items = (data.items || []).sort((a, b) => +a['@sort'] - +b['@sort']);
      buildFilters();
      renderGrid();
      if (startSid) {                        // NEW
        showModal(startSid);                 // NEW – pops the correct card
        params.delete('sid');                // NEW – so F5 doesn’t re-open it
        history.replaceState(null, '', location.pathname + '?' + params); // NEW
      }
    })
    .catch(err => {
      console.error(err);
      grid.innerHTML = '<p class="text-danger">Failed to load items.json</p>';
    });

  /* ---------- Build filter dropdowns ---------- */
  function buildFilters() {
    const addOpts = (select, extractor) => {
      const set = new Set(items.map(extractor).filter(Boolean));
      [...set].sort().forEach(v =>
        select.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
    };

    addOpts(themeSel,    it => it.info?.Subjects        || '');
    addOpts(typologySel, it => it.info?.['Object type'] || '');
    addOpts(periodSel,   it => it.periodTag             || '');

    /* --- pre-select narrative / typology / period if provided ------------------ */
    if (startNarrative && [...themeSel.options].some(o => o.value === startNarrative)) {
      themeSel.value = startNarrative;
    }
    if (preTypology && [...typologySel.options].some(o => o.value === preTypology.trim())) {
      typologySel.value = preTypology.trim();
    }
    if (startPeriod && [...periodSel.options].some(o => o.value === startPeriod.trim())) {
      periodSel.value = startPeriod.trim();
    }

    /* --- event listeners --------------------------------------------- */
    [themeSel, typologySel, periodSel].forEach(sel =>
      sel.addEventListener('change', renderGrid));
  }

  /* ---------- Render grid according to filters ---------- */
  function renderGrid() {
    const th = themeSel.value;
    const ty = typologySel.value;
    const pe = periodSel.value;

    filtered = items.filter(it => {
      const info = it.info || {};
      const okTheme    = th ? (info.Subjects || '').includes(th) : true;
      const okTypology = ty ? info['Object type'] === ty         : true;
      const okPeriod   = pe ? it.periodTag === pe                : true;
      return okTheme && okTypology && okPeriod;
    });

    grid.innerHTML = filtered.length
      ? ''
      : '<p class="text-center text-muted">No items match your filters.</p>';

    filtered.forEach(it => {
      grid.insertAdjacentHTML('beforeend', `
        <div class="col-sm-6 col-lg-4 mb-4">
          <div class="card h-100 shadow-sm">
            <img src="${it.image}" class="card-img-top" alt="${it.shortName}">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${it.shortName}</h5>
              <p class="card-text small flex-grow-1">${it.shortInfo}</p>
              <button class="btn btn-primary mt-2 details-btn" data-id="${it['@sort']}">
                Details
              </button>
            </div>
          </div>
        </div>`);
    });

    // hook up every freshly created Details button
    document.querySelectorAll('.details-btn').forEach(b =>
      b.addEventListener('click', () => showModal(b.dataset.id)));
  }

  /* ---------- Modal helpers ---------- */
  function showModal(sortId) {
    const it = items.find(i => i['@sort'] === sortId);
    if (!it) return;

    document.getElementById('itemModalLabel').textContent = it.shortName;
    const img = document.getElementById('modalImage');
    img.src = it.image;
    img.alt = it.shortName;

    document.getElementById('modalShortInfo').textContent = it.shortInfo || '';

    // metadata
    const tbody = document.getElementById('modalInfoTable');
    tbody.innerHTML = '';
    if (it.info) {
      Object.entries(it.info).forEach(([k, v]) =>
        tbody.insertAdjacentHTML('beforeend', `<tr><th class="text-nowrap w-25">${k}</th><td>${v}</td></tr>`));
    }

    // longer info (array of paragraphs)
    if (Array.isArray(it.longerInfo) && it.longerInfo.length) {
      longerDiv.innerHTML = it.longerInfo.map(p => `<p>${p}</p>`).join('');
      btnLonger.style.display = 'inline-block';
    } else {
      longerDiv.innerHTML = '';
      btnLonger.style.display = 'none';
    }
    longerDiv.classList.remove('show');

    // full story – lazy-load from external HTML once, on first expand
    if (it.fullInfo) {
      fullDiv.dataset.url    = it.fullInfo;
      fullDiv.dataset.loaded = 'false';
      btnFull.style.display  = 'inline-block';
    } else {
      fullDiv.dataset.url    = '';
      btnFull.style.display  = 'none';
    }
    fullDiv.innerHTML = '';
    fullDiv.classList.remove('show');

    modal.show();
  }

  /* ---------- Events for collapsible blocks ---------- */
  fullDiv.addEventListener('show.bs.collapse', () => {
    if (fullDiv.dataset.loaded === 'true') return; // already fetched
    const url = fullDiv.dataset.url;
    if (!url) return;

    fetch(url)
      .then(r => r.text())
      .then(html => {
        fullDiv.innerHTML = html;
        fullDiv.dataset.loaded = 'true';
      })
      .catch(() => {
        fullDiv.innerHTML = '<p class="text-danger">Failed to load full story.</p>';
        fullDiv.dataset.loaded = 'true';
      });
  });

  // reset collapse sections when modal hides
  modalEl.addEventListener('hidden.bs.modal', () => {
    ['modalLongerInfo', 'modalFullInfo'].forEach(id =>
      document.getElementById(id).classList.remove('show'));
  });
})();
