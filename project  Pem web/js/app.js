// -------------------- Mode Pop-up --------------------
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
let popupEnabled = true;

function openModal(html){
  if(!modal || !modalContent) return;

  // Parse fetched HTML and extract the page's main content (.container fallback).
  // If none found, remove header/footer before using body to avoid duplicate header in modal.
  try{
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const selection = doc.querySelector('main') || doc.querySelector('.container') || doc.getElementById('modalContent');
    if(selection){
      modalContent.innerHTML = selection.innerHTML;
    } else {
      const header = doc.querySelector('header'); if(header) header.remove();
      const footer = doc.querySelector('footer'); if(footer) footer.remove();
      modalContent.innerHTML = doc.body.innerHTML || html;
    }
  }catch(err){
    modalContent.innerHTML = html;
  }

  modal.setAttribute('aria-hidden','false');
  modal.setAttribute('aria-modal','true');

  // fokus judul kalau ada
  const title = modalContent.querySelector('#modalTitle');
  if(title) {
    title.setAttribute('tabindex','-1');
    title.focus();
  }

  // initialize interactive parts inside modal
  initDynamicViewsInsideModal();
}

function closeModal(){
  if(!modal) return;
  modal.setAttribute('aria-hidden','true');
  modal.setAttribute('aria-modal','false');
  if(modalContent) modalContent.innerHTML = '';
}

document.addEventListener('click', async (e) => {
  const closeBtn = e.target.closest('[data-close]');
  if(closeBtn){ closeModal(); return; }

  const link = e.target.closest('a[href]');
  if(!link) return;

  const wantsPopup = link.hasAttribute('data-popup');
  if(popupEnabled && wantsPopup){
    e.preventDefault();
    const url = link.getAttribute('href');

    try{
      const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const html = await res.text();
      openModal(html);
      history.pushState({ popup:true, url }, '', '#'+url.replace('.html',''));
    }catch(err){
      openModal(`<div class="container"><h1 id="modalTitle">Gagal memuat</h1><p>Silakan coba lagi.</p></div>`);
    }
  }
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeModal();
});

// -------------------- Keranjang --------------------
const cartKey = 'furnidecor_cart';

function parseRupiahToNumber(value){
  // terima: "Rp 12.550.000" / "12.550.000" / "12550000"
  return Number(String(value || '').replace(/[^\d]/g, '')) || 0;
}

function getCart(){
  try { return JSON.parse(localStorage.getItem(cartKey)) || []; }
  catch{ return []; }
}
function setCart(items){
  localStorage.setItem(cartKey, JSON.stringify(items));
}

function addToCart(item){
  const cart = getCart();
  const idx = cart.findIndex(x => String(x.id) === String(item.id));

  const qty = Number(item.qty) || 1;
  const price = Number(item.price) || 0;

  if(idx >= 0) cart[idx].qty = (Number(cart[idx].qty) || 0) + qty;
  else cart.push({ id:item.id, name:item.name, price, qty });

  setCart(cart);
  alert('Ditambahkan ke Keranjang');

  // kalau keranjang sedang tampil di modal / halaman, refresh tampilan
  renderCart();
}

function renderCart(){
  const tbody = document.getElementById('cartTableBody');
  const totalEl = document.getElementById('cartTotal');
  if(!tbody || !totalEl) return;

  const cart = getCart();
  tbody.innerHTML = '';

  if(cart.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:16px; opacity:.75;">
          Keranjang masih kosong
        </td>
      </tr>
    `;
    totalEl.textContent = `Rp 0`;
    return;
  }

  let total = 0;

  cart.forEach((item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name || '-'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-small" data-decrease="${item.id}">-</button>
        <span style="display:inline-block; min-width:24px; text-align:center;">${qty}</span>
        <button class="btn btn-small" data-increase="${item.id}">+</button>
      </td>
      <td>Rp ${price.toLocaleString('id-ID')}</td>
      <td>Rp ${subtotal.toLocaleString('id-ID')}</td>
      <td><button class="btn btn-outline" data-remove="${item.id}">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

// -------------------- Checkout --------------------
function renderCheckout(){
  const tbody = document.getElementById('checkoutTableBody');
  const totalEl = document.getElementById('checkoutTotal');
  if(!tbody || !totalEl) return;

  const cart = getCart();
  tbody.innerHTML = '';

  let total = 0;
  cart.forEach(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;
    total += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${qty}</td>
      <td>Rp ${price.toLocaleString('id-ID')}</td>
      <td>Rp ${subtotal.toLocaleString('id-ID')}</td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

// -------------------- Event Handler --------------------
document.addEventListener('click', (e) => {
  // Tambah ke keranjang
  const addBtn = e.target.closest('[data-add-cart]');
  if(addBtn){
    e.preventDefault();
    e.stopPropagation();

    const id = addBtn.getAttribute('data-id');
    const name = addBtn.getAttribute('data-name');
    const priceRaw = addBtn.getAttribute('data-price');
    const price = parseRupiahToNumber(priceRaw);

    addToCart({ id, name, price, qty: 1 });
    return;
  }

  // Increase qty
  const incBtn = e.target.closest('[data-increase]');
  if(incBtn){
    const id = incBtn.getAttribute('data-increase');
    const cart = getCart();
    const idx = cart.findIndex(x => String(x.id) === String(id));
    if(idx >= 0){
      cart[idx].qty = (Number(cart[idx].qty) || 0) + 1;
      setCart(cart);
      renderCart();
    }
    return;
  }

  // Decrease qty
  const decBtn = e.target.closest('[data-decrease]');
  if(decBtn){
    const id = decBtn.getAttribute('data-decrease');
    const cart = getCart();
    const idx = cart.findIndex(x => String(x.id) === String(id));
    if(idx >= 0){
      cart[idx].qty = (Number(cart[idx].qty) || 0) - 1;
      if(cart[idx].qty <= 0) cart.splice(idx, 1);
      setCart(cart);
      renderCart();
    }
    return;
  }

  // Remove item
  const remBtn = e.target.closest('[data-remove]');
  if(remBtn){
    const id = remBtn.getAttribute('data-remove');
    const cart = getCart().filter(x => String(x.id) !== String(id));
    setCart(cart);
    renderCart();
    return;
  }
});

// ✅ Ini yang bikin modal keranjang/checkout langsung ke-render setelah fetch
function initDynamicViewsInsideModal(){
  // kalau konten modal / halaman mengandung tabel keranjang
  if (document.getElementById('cartTableBody') && document.getElementById('cartTotal')) {
    renderCart();

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn && !checkoutBtn.dataset.bound) {
      checkoutBtn.dataset.bound = "1";
      checkoutBtn.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length === 0) alert('Keranjang masih kosong!');
        else window.location.href = 'checkout.html';
      });
    }
  }

  // kalau konten modal / halaman mengandung tabel checkout
  if (document.getElementById('checkoutTableBody') && document.getElementById('checkoutTotal')) {
    renderCheckout();
  }
}
// -------------------- Init awal (untuk halaman non-popup juga) --------------------
document.addEventListener('DOMContentLoaded', () => {
  initDynamicViewsInsideModal();

  // Form kontak (opsional)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Terima kasih! Kami akan menghubungi Anda.');
      contactForm.reset();
    });
  }

  // Form checkout sederhana
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm){
    checkoutForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      // Simple confirmation + clear cart
      alert('Pesanan dikonfirmasi. Terima kasih!');
      try{ localStorage.removeItem(cartKey); }catch(e){}
      renderCheckout();
      checkoutForm.reset();
    });
  }
});
/* ===== Simple Image Slider (autoplay + swipe + dots) ===== */
class SimpleSlider {
  constructor(root, { autoplay = 4000 } = {}) {
    this.root = root;
    this.slidesEl = root.querySelector('[data-slider]');
    this.slides = Array.from(this.slidesEl.children);
    this.prevBtn = root.querySelector('[data-prev]');
    this.nextBtn = root.querySelector('[data-next]');
    this.dotsEl = root.querySelector('[data-dots]');
    this.index = 0;
    this.autoplayInterval = autoplay;
    this.timer = null;
    this.isPointerDown = false;
    this.startX = 0;
    this.deltaX = 0;

    this.init();
  }

  init(){
    this.update();
    this.createDots();
    this.bindEvents();
    this.startAutoplay();
  }

  update(){
    const offset = -this.index * 100;
    this.slidesEl.style.transform = `translateX(${offset}%)`;
    // mark active slide for optional animations (Ken Burns)
    this.slides.forEach((s,i) => s.classList.toggle('is-active', i === this.index));
    this.updateDots();
  }

  next(){
    this.index = (this.index + 1) % this.slides.length;
    this.update();
  }

  prev(){
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
    this.update();
  }

  goTo(i){
    this.index = (i + this.slides.length) % this.slides.length;
    this.update();
  }

  startAutoplay(){
    if(!this.autoplayInterval) return;
    this.stopAutoplay();
    this.timer = setInterval(()=> this.next(), this.autoplayInterval);
  }

  stopAutoplay(){
    if(this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  createDots(){
    if(!this.dotsEl) return;
    this.dotsEl.innerHTML = '';
    this.slides.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Slide ${i+1}`);
      btn.addEventListener('click', ()=> { this.goTo(i); this.startAutoplay(); });
      this.dotsEl.appendChild(btn);
    });
    this.updateDots();
  }

  updateDots(){
    if(!this.dotsEl) return;
    Array.from(this.dotsEl.children).forEach((btn, i) => {
      btn.classList.toggle('active', i === this.index);
      btn.setAttribute('aria-selected', i === this.index ? 'true' : 'false');
    });
  }

  bindEvents(){
    this.nextBtn?.addEventListener('click', ()=> { this.next(); this.startAutoplay(); });
    this.prevBtn?.addEventListener('click', ()=> { this.prev(); this.startAutoplay(); });

    // pause on hover
    this.root.addEventListener('mouseenter', ()=> this.stopAutoplay());
    this.root.addEventListener('mouseleave', ()=> this.startAutoplay());

    // touch / pointer for swipe
    this.slidesEl.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true; this.startX = e.clientX; this.deltaX = 0;
      this.stopAutoplay();
      this.slidesEl.setPointerCapture(e.pointerId);
    });
    this.slidesEl.addEventListener('pointermove', (e) => {
      if(!this.isPointerDown) return;
      this.deltaX = e.clientX - this.startX;
      const percent = (this.deltaX / this.root.offsetWidth) * 100;
      this.slidesEl.style.transform = `translateX(${ -this.index * 100 + percent }%)`;
    });
    this.slidesEl.addEventListener('pointerup', (e) => {
      if(!this.isPointerDown) return;
      this.isPointerDown = false;
      const threshold = this.root.offsetWidth * 0.15;
      if(this.deltaX > threshold) this.prev();
      else if(this.deltaX < -threshold) this.next();
      else this.update();
      this.startAutoplay();
    });
    // cancel pointer when leaving
    this.slidesEl.addEventListener('pointercancel', () => { this.isPointerDown = false; this.update(); this.startAutoplay(); });

    // keyboard support
    this.root.addEventListener('keydown', (e) => {
      if(e.key === 'ArrowLeft') { this.prev(); this.startAutoplay(); }
      if(e.key === 'ArrowRight'){ this.next(); this.startAutoplay(); }
    });

    // responsive: ensure correct transform on resize
    window.addEventListener('resize', ()=> this.update());
    // set tabindex to root to allow keyboard events
    this.root.tabIndex = 0;
  }
}

// Init slider on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const sliderRoot = document.querySelector('.image-slider');
  if(sliderRoot) new SimpleSlider(sliderRoot, { autoplay: 4500 });
});
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "on");
    } else {
        localStorage.setItem("darkMode", "off");
    }
}

// Aktifkan otomatis jika sebelumnya ON
window.addEventListener("load", function () {
    if (localStorage.getItem("darkMode") === "on") {
        document.body.classList.add("dark-mode");
    }
});

/* NAV TOGGLE (hamburger) */
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!nav || !navToggle) return;

  navToggle.addEventListener('click', (e) => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.setAttribute('aria-expanded', String(!expanded));
    navToggle.classList.toggle('open', !expanded);
  });

  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('open');
    });
  });

  // close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !navToggle.contains(e.target)) {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('open');
    }
  });
});
