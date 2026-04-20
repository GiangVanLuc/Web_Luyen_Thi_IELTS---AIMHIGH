// Template: one page = one module
import { request } from '../js/api.js';

const state = {
  loading: false,
  error: null,
  items: []
};

const el = {
  list: document.querySelector('[data-role="item-list"]'),
  refreshBtn: document.querySelector('[data-role="refresh"]')
};

function render() {
  if (!el.list) return;
  el.list.innerHTML = state.items.map((item) => `<li>${item.name}</li>`).join('');
}

function setLoading(value) {
  state.loading = value;
}

async function loadItems() {
  setLoading(true);
  try {
    const token = localStorage.getItem('aimhigh_token');
    const res = await request('/items', { token });
    state.items = res.data || [];
    state.error = null;
  } catch (err) {
    state.error = err;
    console.error('loadItems failed', err);
  } finally {
    setLoading(false);
    render();
  }
}

function bindEvents() {
  el.refreshBtn?.addEventListener('click', loadItems);
}

export function initPage() {
  bindEvents();
  loadItems();
}

document.addEventListener('DOMContentLoaded', initPage);
