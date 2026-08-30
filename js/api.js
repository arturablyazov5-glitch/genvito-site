// Тонкая обёртка над fetch — единственное место, знающее про HTTP-эндпоинты.

const Api = {
  profileUrl(path = '') { return `${window.SUPABASE_CONFIG?.url}/functions/v1/workspace-api/profiles${path}`; },
  functionUrl(path) {
    const base = `${window.SUPABASE_CONFIG?.url}/functions/v1/workspace-api`;
    return `${base}/${path}`;
  },
  async request(url, options = {}) {
    const client = window.__supabaseClient || (window.supabase && (window.__supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG?.url, window.SUPABASE_CONFIG?.key)));
    const { data } = await client?.auth.getSession() || {};
    const headers = new Headers(options.headers || {});
    if (data?.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    if (window.activeProfileId) headers.set('X-Profile-Id', encodeURIComponent(window.activeProfileId));
    return fetch(url, { ...options, headers });
  },
  async getStore() {
    const res = await this.request(this.functionUrl('store'));
    return res.json();
  },
  // districts/addresses — сырые (нетримленные) строки построчно, сопоставление
  // по индексу; фильтрация пустых и обрезка пробелов происходит на сервере.
  async saveDistricts(districts, addresses, districtIds) {
    const res = await this.request(this.functionUrl('districts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ districts, addresses, districtIds })
    });
    return res.json();
  },
  async saveServices(services) {
    return jsonOrThrow(this.request(this.functionUrl('services'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services })
    }));
  },
  async saveSettings(settings) {
    const res = await this.request(this.functionUrl('settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },
  // Возвращает { stats, csv } — статистику и уже готовый текст CSV
  // (скачивание не требует повторной генерации, иначе из-за случайных
  // синонимов файл отличался бы от того, что показала статистика).
  async generate() {
    const res = await this.request(this.functionUrl('generate'), { method: 'POST' });
    const data = await res.json().catch(() => ({ error: 'Не удалось сгенерировать файл' }));
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось сгенерировать файл');
    }
    return data;
  },

  // Профили (проекты) — каждый со своим независимым набором районов/услуг.
  async getProfiles() {
    const res = await this.request(this.profileUrl());
    return res.json();
  },
  async createProfile(name) {
    return jsonOrThrow(
      Api.request(this.profileUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
    );
  },
  async activateProfile(id) {
    return jsonOrThrow(Api.request(this.profileUrl(`/${encodeURIComponent(id)}/activate`), { method: 'PUT' }));
  },
  async renameProfile(id, name) {
    return jsonOrThrow(
      Api.request(this.profileUrl(`/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
    );
  },
  async deleteProfile(id) {
    return jsonOrThrow(Api.request(this.profileUrl(`/${encodeURIComponent(id)}`), { method: 'DELETE' }));
  }
};

async function jsonOrThrow(fetchPromise) {
  const res = await fetchPromise;
  const data = await res.json().catch(() => ({ error: 'Не удалось выполнить запрос' }));
  if (!res.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}
