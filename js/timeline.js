const tlContainer = document.getElementById('timeline');
    const progressBar = document.getElementById('progress');
    const nextArrow   = document.getElementById('nextArrow');
    const prevArrow   = document.getElementById('prevArrow');

    /* ——— helpers ——— */
    tlContainer.addEventListener('wheel', e => {
      // horizontal gesture? let the browser deal with it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // vertical gesture → horizontal scroll
      const step = e.deltaY * 1.5;            // 1.5 –-2× feels natural
      tlContainer.scrollBy({ left: step, behavior: 'auto' });
      e.preventDefault();
    }, { passive:false });

    const step = () => tlContainer.clientWidth * 0.8;
    nextArrow.addEventListener('click', () => tlContainer.scrollBy({ left:  step(), behavior: 'smooth' }));
    prevArrow.addEventListener('click', () => tlContainer.scrollBy({ left: -step(), behavior: 'smooth' }));

    function updateArrows() {
      prevArrow.classList.toggle('hidden', tlContainer.scrollLeft <= 5);
      nextArrow.classList.toggle('hidden', tlContainer.scrollLeft + tlContainer.clientWidth >= tlContainer.scrollWidth - 5);
    }
    tlContainer.addEventListener('scroll', () => {
      const max = tlContainer.scrollWidth - tlContainer.clientWidth;
      progressBar.style.width = max ? (tlContainer.scrollLeft / max * 100) + '%' : '0';
      updateArrows();
    });

    /* ——— build timeline ——— */
    fetch('items.json')
      .then(r => r.json())
      .then(data => {
        if (!data?.items) return;
        const items = [...data.items].sort((a, b) => +a['@sort'] - +b['@sort']);

        let current = '', placeAbove = true;
        items.forEach(it => {
          if (it.periodTag !== current) {
            current = it.periodTag;
            const label = document.createElement('div');
            label.className = 'period-label fade-item';
            label.textContent = current;
            tlContainer.appendChild(label);
          }

          const tile = document.createElement('div');
          tile.className = `tl-item fade-item ${placeAbove ? 'above' : 'below'}`;
          placeAbove = !placeAbove;
          // tile.tabIndex = 0;

          /* image */
          const img = document.createElement('img');
          img.src = it.image;
          img.alt = it.shortName;
          tile.appendChild(img);

          /* ✱ NEW: production-date label ✱ */
          const date = document.createElement('span');
          date.className = 'tl-date';
          // prefer a dedicated property, fall back to the one inside “info”
          date.textContent = it.date || it.info?.['Production Date'] || '';
          tile.appendChild(date);

          /* hover overlay */
          const ov  = document.createElement('div');
          ov.className = 'tl-overlay';

          const h4  = document.createElement('h4');
          h4.textContent = it.shortName;
          ov.appendChild(h4);

          const btn = document.createElement('a');
          btn.href  = 'items.html?sid=' + encodeURIComponent(it['@sort']);
          btn.className = 'btn btn-sm btn-light';
          btn.textContent = 'See more';
          ov.appendChild(btn);

          tile.appendChild(ov);
          tlContainer.appendChild(tile);
        });

        /* fade-in intersection observer */
        const obs = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('in-view');
              obs.unobserve(e.target);
            }
          });
        }, { root: tlContainer, threshold: 0.15 });

        document.querySelectorAll('.fade-item').forEach(el => obs.observe(el));
        updateArrows();
      })
      .catch(err => {
        console.error(err);
        tlContainer.innerHTML = '<p class="text-danger">Failed to load timeline data.</p>';
      });