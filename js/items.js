/*  js/items.js  --------------------------------------------------------- */
(() => {
  let items = [];
  let filtered = [];

  const themeSel    = document.getElementById('filterTheme');
  const typologySel = document.getElementById('filterTypology');
  const periodSel   = document.getElementById('filterPeriod');
  const grid        = document.getElementById('itemsGrid');
  const modalEl     = document.getElementById('itemModal');

  const btnLonger = document.getElementById('btnShowLonger');
  const btnFull   = document.getElementById('btnShowFull');
  const longerDiv = document.getElementById('modalLongerInfo');
  const fullDiv   = document.getElementById('modalFullInfo');

  /* ---------- Load data & build UI ---------- */
  fetch('items.json')
    .then(r => r.json())
    .then(data => {
      items = data.items.sort((a, b) => +a['@sort'] - +b['@sort']);
      populateFilters();
      renderGrid();
    })
    .catch(err => {
      console.error(err);
      grid.innerHTML = '<p class="text-danger">Failed to load items.json</p>';
    });

  function populateFilters() {
    const addOpts = (sel, extractor) => {
      const set = new Set(items.map(extractor).filter(Boolean));
      [...set].sort().forEach(v =>
        sel.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
    };

    addOpts(themeSel,    it => it.info?.Subjects        || '');
    addOpts(typologySel, it => it.info?.['Object type'] || '');
    addOpts(periodSel,   it => it.periodTag             || '');

    [themeSel, typologySel, periodSel].forEach(sel =>
      sel.addEventListener('change', renderGrid));
  }

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

    if (!filtered.length) {
      grid.innerHTML = '<p class="text-center text-muted">No items match your filters.</p>';
      return;
    }

    grid.innerHTML = '';
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

    document.querySelectorAll('.details-btn').forEach(b =>
      b.addEventListener('click', () => showModal(b.dataset.id)));
  }

  /* ---------- Modal ---------- */
  function showModal(sortId) {
    const it = items.find(i => i['@sort'] === sortId);
    if (!it) return;

    document.getElementById('itemModalLabel').textContent = it.shortName;
    document.getElementById('modalImage').src = it.image;
    document.getElementById('modalImage').alt = it.shortName;
    document.getElementById('modalShortInfo').textContent = it.shortInfo || '';

    /* metadata table */
    const tbody = document.getElementById('modalInfoTable');
    tbody.innerHTML = '';
    if (it.info) {
      Object.entries(it.info).forEach(([k, v]) =>
        tbody.insertAdjacentHTML('beforeend',
          `<tr><th class="text-nowrap w-25">${k}</th><td>${v}</td></tr>`));
    }

    /* longer info */
    if (it.longerInfo?.length) {
      longerDiv.innerHTML = it.longerInfo.map(p => `<p>${p}</p>`).join('');
      btnLonger.style.display = 'inline-block';
    } else {
      longerDiv.innerHTML = '';
      btnLonger.style.display = 'none';
    }
    longerDiv.classList.remove('show');

    /* full info */
    fullDiv.innerHTML = '';
    fullDiv.dataset.loaded = 'false';
    if (it.fullInfo) {
      fullDiv.dataset.url = it.fullInfo;
      btnFull.style.display = 'inline-block';
    } else {
      fullDiv.dataset.url = '';
      btnFull.style.display = 'none';
    }
    fullDiv.classList.remove('show');

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  /* lazy-load full story when expanded */
  fullDiv.addEventListener('show.bs.collapse', () => {
    if (fullDiv.dataset.loaded === 'true') return;
    const url = fullDiv.dataset.url;
    if (!url) return;

    fetch(url)
      .then(r => r.text())
      .then(ht => {
        fullDiv.innerHTML = ht;
        fullDiv.dataset.loaded = 'true';
      })
      .catch(() => {
        fullDiv.innerHTML = '<p class="text-danger">Failed to load full story.</p>';
      });
  });

  /* reset collapsible blocks when modal closes */
  modalEl.addEventListener('hidden.bs.modal', () => {
    ['modalLongerInfo', 'modalFullInfo'].forEach(id =>
      document.getElementById(id).classList.remove('show'));
  });
})();
