const API = '/api/v1';
const state = {
  token: localStorage.getItem('hotel_token'),
  services: [],
  category: 'TODOS',
  usingDemo: false
};

const categoryLabels = { SPA: 'Spa', PASSEIO: 'Passeio', REFEICAO: 'Gastronomia' };
const categoryImages = {
  SPA: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=82',
  PASSEIO: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82',
  REFEICAO: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=82'
};

const demoServices = [
  { id: null, nome: 'Massagem relaxante', descricao: 'Uma pausa revigorante com técnicas de relaxamento e ambiente acolhedor.', categoria: 'SPA', preco: 180, duracaoMinutos: 60, capacidade: 2, ativo: true },
  { id: null, nome: 'Experiência pela cidade', descricao: 'Descubra paisagens, histórias e sabores locais em um roteiro selecionado.', categoria: 'PASSEIO', preco: 120, duracaoMinutos: 180, capacidade: 12, ativo: true },
  { id: null, nome: 'Jantar do chef', descricao: 'Menu especial em três etapas preparado com ingredientes da estação.', categoria: 'REFEICAO', preco: 210, duracaoMinutos: 120, capacidade: 20, ativo: true }
];

const grid = document.querySelector('#serviceGrid');
const authButton = document.querySelector('#authButton');
const loginModal = document.querySelector('#loginModal');
const bookingModal = document.querySelector('#bookingModal');
const loginForm = document.querySelector('#loginForm');
const bookingForm = document.querySelector('#bookingForm');
const toast = document.querySelector('#toast');

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function escapeHtml(value = '') {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function icon(type) {
  if (type === 'clock') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';
  return '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M4 19c.5-3 2.2-5 5-5s4.5 2 5 5M14 15c2.8-.7 5 .8 5.5 3.5"/></svg>';
}

function serviceCard(service) {
  const image = categoryImages[service.categoria] ?? categoryImages.SPA;
  const demoLabel = state.usingDemo ? ' · demonstração' : '';
  return `
    <article class="service-card">
      <div class="service-card__image">
        <img src="${image}" alt="${escapeHtml(service.nome)}" loading="lazy">
        <span class="service-card__badge">${categoryLabels[service.categoria] ?? service.categoria}</span>
      </div>
      <div class="service-card__body">
        <div class="service-card__title-row">
          <h3>${escapeHtml(service.nome)}</h3>
          <span class="service-card__price">${money(service.preco)}</span>
        </div>
        <p class="service-card__description">${escapeHtml(service.descricao || 'Uma experiência preparada especialmente para sua estadia.')}</p>
        <div class="service-card__meta">
          <span>${icon('clock')}${service.duracaoMinutos} min</span>
          <span>${icon('people')}até ${service.capacidade} pessoa${service.capacidade === 1 ? '' : 's'}</span>
        </div>
        <div class="service-card__footer">
          <span class="service-card__status">● Disponível${demoLabel}</span>
          <button class="button button--gold" type="button" data-book="${service.id ?? ''}" data-name="${escapeHtml(service.nome)}">Agendar</button>
        </div>
      </div>
    </article>`;
}

function renderServices() {
  const filtered = state.category === 'TODOS'
    ? state.services
    : state.services.filter((service) => service.categoria === state.category);
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><h3>Nenhum serviço encontrado</h3><p>Altere o filtro ou cadastre novos serviços pela API.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map(serviceCard).join('');
}

function showToast(message, error = false) {
  toast.textContent = message;
  toast.classList.toggle('is-error', error);
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}

function setAuthButton() {
  authButton.textContent = state.token ? 'Sair' : 'Entrar';
}

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers ?? {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? 'Não foi possível concluir a solicitação');
  return data;
}

async function loadServices() {
  if (!state.token) {
    state.services = demoServices;
    state.usingDemo = true;
    renderServices();
    return;
  }
  grid.innerHTML = '<div class="empty-state"><h3>Carregando experiências…</h3></div>';
  try {
    const services = await api('/servicos?ativo=true');
    state.services = services;
    state.usingDemo = false;
  } catch (error) {
    state.services = demoServices;
    state.usingDemo = true;
    showToast(`${error.message}. Exibindo serviços de demonstração.`, true);
  }
  renderServices();
}

function openLogin() {
  if (!loginModal.open) loginModal.showModal();
}

authButton.addEventListener('click', () => {
  if (state.token) {
    localStorage.removeItem('hotel_token');
    state.token = null;
    setAuthButton();
    loadServices();
    showToast('Sessão encerrada.');
  } else openLogin();
});
document.querySelector('#heroLogin').addEventListener('click', openLogin);

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  try {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    state.token = result.token;
    localStorage.setItem('hotel_token', result.token);
    loginModal.close();
    setAuthButton();
    await loadServices();
    showToast('Acesso realizado com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-book]');
  if (!button) return;
  if (!state.token) {
    showToast('Entre para realizar o agendamento.');
    openLogin();
    return;
  }
  if (!button.dataset.book) {
    showToast('Este é um serviço de demonstração. Cadastre serviços reais pela API.', true);
    return;
  }
  bookingForm.elements.servicoExtraId.value = button.dataset.book;
  document.querySelector('#bookingTitle').textContent = `Agendar ${button.dataset.name}`;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  bookingForm.elements.dataAgendamento.min = tomorrow;
  bookingForm.elements.dataAgendamento.value = tomorrow;
  bookingModal.showModal();
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(bookingForm));
  data.quantidadePessoas = Number(data.quantidadePessoas);
  try {
    const result = await api('/agendamentos', { method: 'POST', body: JSON.stringify(data) });
    bookingModal.close();
    showToast(`Agendamento criado com status ${result.status}.`);
  } catch (error) {
    showToast(error.message, true);
  }
});

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close());
});
document.querySelectorAll('.modal').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelectorAll('.filter-chip').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.filter-chip.is-active')?.classList.remove('is-active');
    button.classList.add('is-active');
    state.category = button.dataset.category;
    renderServices();
  });
});

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', () => {
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
});

document.querySelector('#newsletterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast('Cadastro realizado. Obrigado!');
});

setAuthButton();
loadServices();
