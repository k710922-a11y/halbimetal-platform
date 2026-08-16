import './styles.css';

const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});

try {
  const content = JSON.parse(localStorage.getItem('halbi.content') || '{}');
  document.querySelectorAll('[data-content]').forEach((element) => {
    const [section, field] = element.dataset.content.split('.');
    if (content[section]?.[field]) element.textContent = content[section][field];
    const size = content[section]?.[`${field}Size`];
    if (Number.isFinite(Number(size))) element.style.fontSize = `${Number(size)}px`;
  });
} catch { /* Keep bundled defaults when local content is invalid. */ }

nav?.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    menuButton?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  }
});
