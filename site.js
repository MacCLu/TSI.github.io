const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const photo = document.querySelector('[data-parallax]');

if (photo) {
  let frame = 0;
  const updateParallax = () => {
    frame = 0;
    const section = photo.parentElement;
    const offset = Math.max(0, -section.getBoundingClientRect().top);
    const shift = motion.matches ? 0 : Math.min(offset * 0.16, section.offsetHeight * 0.085);
    photo.style.setProperty('--shift', shift + 'px');
  };
  const requestParallax = () => {
    if (!frame) frame = requestAnimationFrame(updateParallax);
  };
  addEventListener('scroll', requestParallax, { passive: true });
  addEventListener('resize', requestParallax);
  motion.addEventListener('change', requestParallax);
  requestParallax();
}

const track = document.querySelector('.gallery-track');

if (track) {
  const gallery = track.closest('section');
  const slides = Array.from(track.children);
  const controls = document.querySelector('.gallery-controls');
  const dots = document.querySelector('.gallery-dots');
  const autoplay = controls.querySelector('[data-autoplay]');
  const delay = 2000;
  let active = 0;
  let requested = null;
  let timer;
  let inView = false;
  let paused = false;
  let hovered = false;

  function goTo(index) {
    requested = (index + slides.length) % slides.length;
    track.scrollTo({
      left: track.clientWidth * requested,
      behavior: motion.matches ? 'instant' : 'smooth'
    });
  }

  const selectors = slides.map((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', slide.querySelector('figcaption').textContent);
    dot.addEventListener('click', () => goTo(index));
    dots.append(dot);
    return dot;
  });

  function syncGallery() {
    active = Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth));
    if (requested !== null && Math.abs(track.scrollLeft - track.clientWidth * requested) < 2) requested = null;
    selectors.forEach((dot, index) => dot.setAttribute('aria-current', String(index === active)));
  }

  function scheduleAutoplay() {
    clearTimeout(timer);
    if (!inView || paused || hovered || document.hidden || motion.matches || document.querySelector('.photo-viewer[open]') ||
        gallery.contains(document.activeElement)) return;
    timer = setTimeout(() => {
      goTo((requested ?? active) + 1);
      scheduleAutoplay();
    }, delay);
  }

  autoplay.addEventListener('click', () => {
    paused = !paused;
    autoplay.textContent = paused ? 'Play' : 'Pause';
    autoplay.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    scheduleAutoplay();
  });
  gallery.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    scheduleAutoplay();
  });
  gallery.addEventListener('pointerleave', () => {
    hovered = false;
    scheduleAutoplay();
  });
  gallery.addEventListener('focusin', scheduleAutoplay);
  gallery.addEventListener('focusout', () => requestAnimationFrame(scheduleAutoplay));
  document.addEventListener('visibilitychange', scheduleAutoplay);
  function syncMotion() {
    autoplay.hidden = motion.matches;
    scheduleAutoplay();
  }
  motion.addEventListener('change', syncMotion);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
    scheduleAutoplay();
  }, { threshold: 0.35 }).observe(track);
  syncMotion();

  controls.querySelector('[data-prev]').addEventListener('click', () => goTo((requested ?? active) - 1));
  controls.querySelector('[data-next]').addEventListener('click', () => goTo((requested ?? active) + 1));
  track.addEventListener('scroll', syncGallery, { passive: true });
  track.addEventListener('pointerdown', () => {
    requested = null;
    scheduleAutoplay();
  });
  track.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    goTo((requested ?? active) + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  controls.hidden = false;
  dots.hidden = false;
  syncGallery();
}

const form = document.querySelector('.quote-form');

if (form) {
  const params = new URLSearchParams(location.search);
  const state = params.get('destination');
  const destination = form.elements.namedItem('destination');
  if (Array.from(destination.options).some(option => option.value === state)) destination.value = state;
  if (params.get('storage') === 'yes') form.elements.namedItem('storage').checked = true;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const message = [
      'Hello TSI, I would like a freight quote.',
      'Pickup: ' + values.get('pickup').trim(),
      'Destination: ' + values.get('delivery').trim() + ', ' + values.get('destination'),
      'Cargo: ' + values.get('cargo').trim()
    ];
    if (values.get('date')) message.push('Preferred pickup date: ' + values.get('date'));
    if (values.has('storage')) message.push('I would also like to ask about carton storage.');
    const url = new URL(form.action);
    url.searchParams.set('text', message.join('\n'));
    location.assign(url);
  });
}

// Reveal each section once while keeping content visible if scripting is unavailable.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    if (!motion.matches) entry.target.classList.add('section-arrive');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll('main .section').forEach(section => revealObserver.observe(section));

if (form) {
  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const progress = form.querySelector('.quote-progress');
  const navigation = form.querySelector('.quote-navigation');
  const back = form.querySelector('[data-back]');
  const next = form.querySelector('[data-continue]');
  const submit = form.querySelector('[type="submit"]');
  let step = 0;

  function showStep() {
    steps.forEach((panel, index) => { panel.hidden = index !== step; });
    progress.textContent = 'Step ' + (step + 1) + ' of 2 · ' + (step === 0 ? 'Your route' : 'Your load');
    back.hidden = step === 0;
    next.hidden = step === 1;
    submit.hidden = step === 0;
  }

  next.addEventListener('click', () => {
    const fields = Array.from(steps[0].querySelectorAll('input, select'));
    const invalid = fields.find(field => !field.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    step = 1;
    showStep();
    steps[1].querySelector('input').focus();
  });
  back.addEventListener('click', () => {
    step = 0;
    showStep();
    steps[0].querySelector('input').focus();
  });
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && step === 0 && event.target.tagName === 'INPUT') {
      event.preventDefault();
      next.click();
    }
  });
  progress.hidden = false;
  navigation.hidden = false;
  showStep();
}

const galleryImages = Array.from(document.querySelectorAll('.gallery-track figure img'));
if (galleryImages.length) {
  const viewer = document.createElement('dialog');
  viewer.className = 'photo-viewer';
  viewer.setAttribute('aria-label', 'Freight photo viewer');
  viewer.innerHTML = '<div class="photo-toolbar"><button type="button" data-photo-prev aria-label="Previous enlarged photo">← Previous</button><button type="button" data-photo-close>Close ×</button><button type="button" data-photo-next aria-label="Next enlarged photo">Next →</button></div><img alt=""><p aria-live="polite"></p>';
  document.body.append(viewer);
  let current = 0;
  let opener;
  function displayImage(index) {
    current = (index + galleryImages.length) % galleryImages.length;
    const source = galleryImages[current];
    viewer.querySelector('img').src = source.src;
    viewer.querySelector('img').alt = source.alt;
    viewer.querySelector('p').textContent = source.closest('figure').querySelector('figcaption').textContent;
  }
  galleryImages.forEach((img, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Enlarge photo: ' + img.alt);
    img.replaceWith(button);
    button.append(img);
    button.addEventListener('click', () => {
      opener = button;
      displayImage(index);
      viewer.showModal();
    });
  });
  viewer.querySelector('[data-photo-close]').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-photo-prev]').addEventListener('click', () => displayImage(current - 1));
  viewer.querySelector('[data-photo-next]').addEventListener('click', () => displayImage(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      displayImage(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  viewer.addEventListener('close', () => opener?.focus());
}

const reviews = document.querySelector('.review-carousel');
if (reviews) {
  const slides = Array.from(reviews.querySelectorAll('.review-slide'));
  const controls = reviews.querySelector('.review-controls');
  const pause = reviews.querySelector('[data-review-pause]');
  let current = 0;
  let paused = false;
  let hovered = false;
  let visible = false;
  let timer;
  let changing = false;

  function scheduleReview() {
    clearTimeout(timer);
    if (paused || hovered || !visible || document.hidden || motion.matches || reviews.contains(document.activeElement)) return;
    timer = setTimeout(() => changeReview(1), 2000);
  }

  async function changeReview(direction) {
    if (changing) return;
    changing = true;
    clearTimeout(timer);
    const oldSlide = slides[current];
    if (!motion.matches) {
      await oldSlide.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}], {duration:240,easing:'ease-in'}).finished;
    }
    oldSlide.hidden = true;
    current = (current + direction + slides.length) % slides.length;
    const nextSlide = slides[current];
    nextSlide.hidden = false;
    reviews.querySelector('[data-review-count]').textContent = (current + 1) + ' / ' + slides.length;
    if (!motion.matches) {
      await nextSlide.animate([{opacity:0,transform:'translateY(16px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}], {duration:400,easing:'ease-out'}).finished;
    }
    changing = false;
    scheduleReview();
  }

  controls.hidden = false;
  reviews.querySelector('[data-review-prev]').addEventListener('click', () => changeReview(-1));
  reviews.querySelector('[data-review-next]').addEventListener('click', () => changeReview(1));
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? 'Play' : 'Pause';
    scheduleReview();
  });
  reviews.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') hovered = true;
    scheduleReview();
  });
  reviews.addEventListener('pointerleave', () => { hovered = false; scheduleReview(); });
  reviews.addEventListener('focusin', scheduleReview);
  reviews.addEventListener('focusout', () => requestAnimationFrame(scheduleReview));
  document.addEventListener('visibilitychange', scheduleReview);
  motion.addEventListener('change', scheduleReview);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    scheduleReview();
  }, {threshold:0.25}).observe(reviews);
}

const truckScene = document.querySelector('.truck-scene');
if (truckScene) {
  const motionToggle = truckScene.querySelector('.motion-toggle');
  motionToggle.addEventListener('click', () => {
    const paused = truckScene.classList.toggle('motion-paused');
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? 'Play motion' : 'Pause motion';
  });
}
