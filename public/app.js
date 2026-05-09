// =============================================
//   KUCING OFFICIAL - FRONTEND SCRIPT
// =============================================

// ── State ──────────────────────────────────
let currentCategory = 'asia';
let currentVideoUrl = '';
let videosCache = {};

// ── Category labels ─────────────────────────
const CAT_INFO = {
  asia:  { label: 'Asia',  icon: 'globe-2' },
  lokal: { label: 'Lokal', icon: 'home' },
  barat: { label: 'Barat', icon: 'globe' }
};

// ── DOM refs ────────────────────────────────
const videoGrid   = document.getElementById('video-grid');
const loadingEl   = document.getElementById('loading');
const emptyEl     = document.getElementById('empty-state');
const countEl     = document.getElementById('video-count');
const catLabelEl  = document.getElementById('current-cat-label');
const modal       = document.getElementById('video-modal');
const modalThumb  = document.getElementById('modal-thumb');
const modalTitle  = document.getElementById('modal-title');

// ── Init ────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Init Lucide icons
  if (window.lucide) lucide.createIcons();

  // Read URL param
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam && ['asia', 'lokal', 'barat'].includes(catParam)) {
    currentCategory = catParam;
  }

  // Set active tab
  setActiveTab(currentCategory);

  // Load videos
  await loadVideos(currentCategory);

  // Load and inject ads
  await loadAds();

  // Re-init icons after dynamic content
  if (window.lucide) lucide.createIcons();
});

// ── Tab switching ────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab;
    if (tab === currentCategory) return;

    // Animate button
    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 300);

    currentCategory = tab;
    setActiveTab(tab);
    await loadVideos(tab);

    // Update URL without reload
    history.pushState(null, '', `?cat=${tab}`);
  });
});

function setActiveTab(cat) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === cat);
  });
  // Update section label
  const info = CAT_INFO[cat];
  catLabelEl.innerHTML = `
    <i data-lucide="${info.icon}" class="cat-icon"></i>
    <span>${info.label}</span>
  `;
  if (window.lucide) lucide.createIcons();
}

// ── Load Videos ─────────────────────────────
async function loadVideos(category) {
  // Show loading
  videoGrid.style.display = 'none';
  emptyEl.style.display   = 'none';
  loadingEl.style.display = 'flex';
  countEl.textContent     = '...';

  try {
    // Use cache
    if (videosCache[category]) {
      renderVideos(videosCache[category], category);
      return;
    }

    const res  = await fetch(`/api/videos/${category}`);
    const data = await res.json();
    videosCache[category] = data.videos || [];
    renderVideos(videosCache[category], category);
  } catch (err) {
    console.error('Gagal memuat video:', err);
    loadingEl.style.display = 'none';
    emptyEl.style.display   = 'flex';
    countEl.textContent     = '0 Video';
  }
}

// ── Render Video Grid ────────────────────────
function renderVideos(videos, category) {
  loadingEl.style.display = 'none';

  if (!videos || videos.length === 0) {
    emptyEl.style.display   = 'flex';
    videoGrid.style.display = 'none';
    countEl.textContent     = '0 Video';
    return;
  }

  countEl.textContent     = `${videos.length} Video`;
  emptyEl.style.display   = 'none';
  videoGrid.style.display = 'grid';

  videoGrid.innerHTML = videos.map(v => `
    <div class="video-card"
         onclick="openModal('${escHtml(v.videy_url)}', '${escHtml(v.thumbnail)}', '${escHtml(v.title)}')"
         data-id="${v.id}">
      <div class="card-thumb-wrap">
        <img
          class="card-thumb"
          src="${escHtml(v.thumbnail)}"
          alt="${escHtml(v.title)}"
          loading="lazy"
          onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'225\\' viewBox=\\'0 0 400 225\\'><rect fill=\\'%231a0020\\' width=\\'400\\' height=\\'225\\'/><text fill=\\'%23c71585\\' font-family=\\'sans-serif\\' font-size=\\'14\\' x=\\'200\\' y=\\'112\\' text-anchor=\\'middle\\'>No Image</text></svg>'"
        />
        <div class="card-play-overlay">
          <div class="play-circle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(v.title)}</div>
        <span class="card-tag">${category}</span>
      </div>
    </div>
  `).join('');

  // Card click animation
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', function() {
      this.classList.add('card-clicked');
      setTimeout(() => this.classList.remove('card-clicked'), 350);
    });
  });
}

// ── Modal ────────────────────────────────────
function openModal(videyUrl, thumbnail, title) {
  currentVideoUrl     = videyUrl;
  modalThumb.src      = thumbnail;
  modalTitle.textContent = title;

  // Fallback thumbnail
  modalThumb.onerror = () => {
    modalThumb.style.display = 'none';
  };

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  currentVideoUrl = '';
  modalThumb.src  = '';
}

function watchVideo() {
  if (currentVideoUrl) {
    window.open(currentVideoUrl, '_blank');
  }
  closeModal();
}

// Close modal on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Load & Inject Ads ────────────────────────
async function loadAds() {
  try {
    const res  = await fetch('/api/ads');
    const data = await res.json();
    const ads  = data.ads || {};

    injectAd('ad-social-bar',        ads.social_bar);
    injectAd('ad-banner-top',        ads.native_banner);
    injectAd('ad-banner-160x300',    ads.banner_160x300);
    injectAd('ad-banner-300x250',    ads.banner_300x250);
    injectAd('ad-banner-160x600',    ads.banner_160x600);
    injectAd('ad-banner-728x90',     ads.banner_728x90);
    injectAd('ad-banner-468x60',     ads.banner_468x60);
    injectAd('ad-banner-320x50',     ads.banner_320x50);

    // Popunder & Smart Link - injected into body as script
    if (ads.popunder && ads.popunder.trim())    injectScript(ads.popunder);
    if (ads.smart_link && ads.smart_link.trim()) injectScript(ads.smart_link);

  } catch (err) {
    console.warn('Ads tidak dimuat:', err.message);
  }
}

function injectAd(containerId, code) {
  if (!code || !code.trim()) return;
  const el = document.getElementById(containerId);
  if (!el) return;

  // Execute scripts inside the code
  const temp = document.createElement('div');
  temp.innerHTML = code;
  el.innerHTML   = '';

  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeName === 'SCRIPT') {
      const s = document.createElement('script');
      if (node.src)  s.src  = node.src;
      if (node.type) s.type = node.type;
      s.textContent = node.textContent;
      el.appendChild(s);
    } else {
      el.appendChild(node.cloneNode(true));
    }
  });
}

function injectScript(code) {
  if (!code || !code.trim()) return;
  const temp = document.createElement('div');
  temp.innerHTML = code;
  Array.from(temp.querySelectorAll('script')).forEach(origScript => {
    const s = document.createElement('script');
    if (origScript.src)  s.src  = origScript.src;
    if (origScript.type) s.type = origScript.type;
    s.textContent = origScript.textContent;
    document.body.appendChild(s);
  });
}

// ── HTML escape helper ───────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Expose for HTML onclick ──────────────────
window.openModal   = openModal;
window.closeModal  = closeModal;
window.watchVideo  = watchVideo;
