import { ApiService } from './api.service';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with no key when localStorage is empty', () => {
    const api = new ApiService();
    expect(api.familyKey()).toBeNull();
  });

  it('restores a saved key from localStorage on construction', () => {
    localStorage.setItem('familyKey', 'demo');
    const api = new ApiService();
    expect(api.familyKey()).toBe('demo');
  });

  it('login() stores the key and persists it to localStorage on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const api = new ApiService();

    const ok = await api.login('demo');

    expect(ok).toBe(true);
    expect(api.familyKey()).toBe('demo');
    expect(localStorage.getItem('familyKey')).toBe('demo');
  });

  it('login() does not store the key on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false }, 401));
    const api = new ApiService();

    const ok = await api.login('wrong');

    expect(ok).toBe(false);
    expect(api.familyKey()).toBeNull();
    expect(localStorage.getItem('familyKey')).toBeNull();
  });

  it('logout() clears the key from state and localStorage', () => {
    localStorage.setItem('familyKey', 'demo');
    const api = new ApiService();

    api.logout();

    expect(api.familyKey()).toBeNull();
    expect(localStorage.getItem('familyKey')).toBeNull();
  });

  it('adds the x-family-key header on data requests when a key is stored', async () => {
    localStorage.setItem('familyKey', 'demo');
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.canales();

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Record<string, string>;
    expect(headers['x-family-key']).toBe('demo');
  });

  it('does not send x-family-key when no key is stored', async () => {
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.canales();

    const [, options] = fetchMock.mock.calls[0];
    const headers = (options.headers ?? {}) as Record<string, string>;
    expect(headers['x-family-key']).toBeUndefined();
  });

  it('logs out automatically when a data request responds 401', async () => {
    localStorage.setItem('familyKey', 'demo');
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 401));

    await expect(api.canales()).rejects.toThrow();

    expect(api.familyKey()).toBeNull();
    expect(localStorage.getItem('familyKey')).toBeNull();
  });

  it('series() builds the query string from filters', async () => {
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse({ total: 0, limit: 50, offset: 0, series: [] }));

    await api.series({ canal: 'disney', q: 'duck' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/series?');
    expect(url).toContain('canal=disney');
    expect(url).toContain('q=duck');
  });

  it('serie() requests the series detail endpoint by slug', async () => {
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse({ slug: 'ducktales' }));

    await api.serie('ducktales');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/series/ducktales');
  });

  it('episodios() requests the episodes list for a series', async () => {
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.episodios('ducktales');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/series/ducktales/episodios');
  });

  it('episodio() requests a single episode by id', async () => {
    const api = new ApiService();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 5 }));

    await api.episodio(5);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/episodios/5');
  });
});
