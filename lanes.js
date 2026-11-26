// WP11 story lanes client script. Loaded by /lanes/ and /en/lanes/; reads the
// slim story graph over fetch and renders lanes/year panel. Kept outside the
// page HTML so internal link templates are not scanned as static attributes.
(function () {
  const board = document.getElementById('lanes-board');
  if (!board) return;
  const loading = document.getElementById('lanes-loading');
  const yearSelect = document.getElementById('lanes-year-select');
  const onlyYear = document.getElementById('lanes-only-year');
  const yearList = document.getElementById('lanes-year-list');
  const yearTitle = document.getElementById('lanes-year-title');

  const prefix = board.dataset.prefix || '';
  const lang = board.dataset.lang || 'zh';
  const en = lang === 'en';

  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function storyHref(slug, no) {
    return prefix + '/stories/' + slug + '/#chapter-' + no;
  }

  function renderBoard(graph) {
    const stories = graph.stories || [];
    const min = graph.yearRange?.min ?? Math.min(...stories.flatMap(s => s.chapters.map(c => c.year)));
    const max = graph.yearRange?.max ?? Math.max(...stories.flatMap(s => s.chapters.map(c => c.year)));
    const span = Math.max(1, max - min);

    const years = [...new Set(stories.flatMap(s => s.chapters.map(c => c.year)))].sort((a, b) => a - b);
    yearSelect.disabled = false;
    yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
    const defaultYear = years.includes(200) ? 200 : years[0];
    yearSelect.value = String(defaultYear);

    const ticks = [];
    for (let year = min; year <= max; year += 10) ticks.push(year);
    if (ticks[ticks.length - 1] !== max) ticks.push(max);

    const x = year => ((year - min) / span) * 100;

    let html = `<div class="lanes-axis" aria-hidden="true">${ticks.map(year => `<span style="left:${x(year)}%">${year}</span>`).join('')}</div>`;
    html += stories.map((story, row) => {
      const chapters = (story.chapters || []).slice().sort((a, b) => a.no - b.no);
      const byYear = new Map();
      const dots = chapters.map(ch => {
        const sameYearCount = byYear.get(ch.year) || 0;
        byYear.set(ch.year, sameYearCount + 1);
        const offset = sameYearCount * 8;
        const label = esc(ch.title?.[lang] || ch.title?.zh || '') + ' · ' + ch.year;
        return `<a class="lanes-dot" href="${storyHref(story.slug, ch.no)}" style="left:${x(ch.year)}%;top:calc(50% - 10px + ${offset}px)" title="${label}" data-year="${ch.year}" data-slug="${esc(story.slug)}" data-no="${ch.no}"><span>${ch.no}</span></a>`;
      }).join('');
      return `<div class="lanes-row" data-row="${row}">
        <div class="lanes-label"><strong>${esc(story.title?.[lang] || story.title?.zh || '')}</strong><small>${esc(story.period?.label?.[lang] || '')}</small></div>
        <div class="lanes-track">${dots}</div>
      </div>`;
    }).join('');

    board.innerHTML = html;
    if (loading) loading.remove();

    function renderYearPanel(year) {
      const items = stories.flatMap(story => (story.chapters || [])
        .filter(ch => ch.year === year)
        .map(ch => ({ story, ch })));
      yearTitle.textContent = en ? `Chapters in ${year}` : `${year} 年章节`;
      yearList.innerHTML = items.map(({ story, ch }) => `
        <li>
          <a href="${storyHref(story.slug, ch.no)}">
            <strong>${esc(story.title?.[lang] || story.title?.zh || '')}</strong>
            <small>${en ? `Ch. ${ch.no} · ${ch.year}` : `第 ${ch.no} 章 · ${ch.year}`}</small>
            <span>${esc(ch.title?.[lang] || ch.title?.zh || '')}</span>
          </a>
        </li>`).join('') || `<li>${en ? 'No chapter dated to this year.' : '该年没有章节。'}</li>`;
      board.querySelectorAll('.lanes-dot').forEach(dot => {
        const active = Number(dot.dataset.year) === Number(year);
        dot.classList.toggle('is-year', active);
        dot.classList.toggle('is-dim', onlyYear.checked && !active);
      });
    }

    yearSelect.addEventListener('change', () => renderYearPanel(Number(yearSelect.value)));
    onlyYear.addEventListener('change', () => renderYearPanel(Number(yearSelect.value)));
    renderYearPanel(Number(defaultYear));
  }

  fetch('/data/story-graph.json')
    .then(response => {
      if (!response.ok) throw new Error(`graph ${response.status}`);
      return response.json();
    })
    .then(renderBoard)
    .catch(() => {
      if (loading) loading.textContent = en ? 'The story graph is unavailable in this build.' : '本次构建缺少故事图谱数据。';
    });
})();
