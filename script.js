const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');
const appliedTheme = savedTheme || (prefersDark ? 'dark' : 'light');

document.documentElement.setAttribute('data-theme', appliedTheme);

const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', current);
    localStorage.setItem('theme', current);
  });
}

const linksGrid = document.getElementById('linksGrid');
const cardTemplate = document.getElementById('cardTemplate');
const notice = document.getElementById('notice');

function getBasePath() {
  const path = window.location.pathname;
  // Return the directory portion of the current path, always ending with '/'
  return path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
}

async function loadLinks() {
  const basePath = getBasePath();
  const res = await fetch(`${basePath}links.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить links.json');
  return res.json();
}

function createCard(link) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  const title = node.querySelector('.card-title');
  const desc = node.querySelector('.card-desc');
  const icon = node.querySelector('.card-icon');
  node.href = link.url;
  node.target = link.target === 'self' ? '_self' : '_blank';
  title.textContent = link.title;
  desc.textContent = link.description || link.url;
  if (link.color) {
    icon.style.background = link.color;
  }
  if (link.icon) {
    const isHttp = /^https?:/i.test(link.icon);
    const isRootRelative = link.icon.startsWith('/');
    const basePath = getBasePath();
    const img = new Image();
    img.src = isHttp ? link.icon : (isRootRelative ? link.icon : (basePath + link.icon));
    img.alt = '';
    img.width = 50;
    img.height = 50;
    img.decoding = 'async';
    if (isHttp) img.referrerPolicy = 'no-referrer';
    icon.appendChild(img);
  } else {
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0m5.2-2.8a1 1 0 0 0 0 1.4l1.1 1.1a3 3 0 0 0 4.3 0l1.1-1.1a1 1 0 1 0-1.4-1.4l-1.1 1.1a1 1 0 0 1-1.4 0L9.6 8.8a1 1 0 0 0-1.4 0Z"/></svg>';
  }
  return node;
}

function renderLinks(links) {
  linksGrid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  links.forEach(link => {
    fragment.appendChild(createCard(link));
  });
  linksGrid.appendChild(fragment);
}

function showNotice(text) {
  if (!text) {
    notice.hidden = true;
    notice.textContent = '';
    return;
  }
  notice.hidden = false;
  notice.textContent = text;
}

function getSlugFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  // project pages: [repo, maybe, slug]
  return segments.length >= 2 ? segments[segments.length - 1] : '';
}

function maybeRedirectBySlug(links) {
  const slug = getSlugFromPath();
  const params = new URLSearchParams(window.location.search);
  const to = params.get('to');
  const targetSlug = slug || to || '';
  if (!targetSlug) return false;
  const match = links.find(l => l.slug === targetSlug);
  if (match) {
    const openInNew = (params.get('open') || match.target) !== 'self';
    if (openInNew) {
      window.open(match.url, '_blank', 'noopener');
      // Navigate back to base listing after opening new tab
      const basePath = getBasePath();
      window.location.replace(basePath);
    } else {
      window.location.replace(match.url);
    }
    return true;
  }
  if (slug) {
    showNotice(`Ссылка для «${slug}» не найдена`);
  }
  return false;
}

(async () => {
  try {
    const links = await loadLinks();
    // Try path-based redirect first
    if (!maybeRedirectBySlug(links)) {
      renderLinks(links);
    }
  } catch (e) {
    showNotice('Ошибка загрузки ссылок. Проверьте links.json.');
    console.error(e);
  }
})();


