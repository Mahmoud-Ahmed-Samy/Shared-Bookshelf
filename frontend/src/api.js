const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/+$/, '');
const BOOKS_BASE_URL = `${API_BASE_URL}/books`;
const ACTIVITY_BASE_URL = `${API_BASE_URL}/activity`;
const AUTH_BASE_URL = `${API_BASE_URL}/auth`;
const AUTH_TOKEN_KEY = 'bookshelf.token';

const FIELD_LABELS = {
  title: 'Title',
  author: 'Author',
  genre: 'Genre',
  year: 'Year',
  coverUrl: 'Cover',
};

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function buildFriendlyError(response) {
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }

  if (response.status === 401) {
    return 'Your session has ended. Please log in again.';
  }
  if (response.status === 403) {
    return 'You do not have permission to do that.';
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (Object.values(data).some((value) => typeof value === 'string' && value.toLowerCase().includes('already exists'))) {
      return 'Book already exists.';
    }
    const messages = Object.entries(data).map(([field, msg]) => {
      const label = FIELD_LABELS[field] || field;
      return `${label} ${msg}`;
    });
    if (messages.length > 0) {
      return `Fix these details: ${messages.join(', ')}.`;
    }
  }

  if (response.status === 404) {
    return "We couldn't find that item. It may have been removed.";
  }
  if (response.status >= 500) {
    return 'Server error. Try again in a moment.';
  }
  return "That didn't go through. Check the details and try again.";
}

async function request(url, options = {}, { includeAuth = true } = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(includeAuth ? getAuthHeaders() : {}),
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (_) {
    throw new Error("Can't reach the BookShelf server. Make sure the backend is running, then try again.");
  }

  if (response.status === 401 && includeAuth && unauthorizedHandler) {
    unauthorizedHandler();
  }

  if (!response.ok) {
    throw new Error(await buildFriendlyError(response));
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export async function registerUser(email, username, password) {
  return request(`${AUTH_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  }, { includeAuth: false });
}

export async function loginUser(email, password) {
  return request(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, { includeAuth: false });
}

export async function fetchAllBooks() {
  return fetchAllBooksWithParams({});
}

export async function fetchAllBooksWithParams(params = {}) {
  const query = new URLSearchParams();

  if (params.query) query.set('query', String(params.query));
  if (params.yearFrom != null && params.yearFrom !== '') query.set('yearFrom', String(params.yearFrom));
  if (params.yearTo != null && params.yearTo !== '') query.set('yearTo', String(params.yearTo));
  if (params.exactYear != null && params.exactYear !== '') query.set('exactYear', String(params.exactYear));
  if (params.trusted) query.set('trusted', 'true');
  if (params.sortField) query.set('sortField', String(params.sortField));
  if (params.sortDirection) query.set('sortDirection', String(params.sortDirection));

  const url = query.toString() ? `${BOOKS_BASE_URL}?${query.toString()}` : BOOKS_BASE_URL;

  try {
    return await request(url);
  } catch (err) {
    if (err.message.startsWith("Can't reach") || err.message.startsWith('Your session has ended')) {
      throw err;
    }
    throw new Error("Can't load books. Refresh and try again.");
  }
}

export async function fetchActivity() {
  return request(ACTIVITY_BASE_URL, {}, { includeAuth: false });
}

export async function createBook(book) {
  return request(BOOKS_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  });
}

export async function updateBook(id, book) {
  return request(`${BOOKS_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  });
}

export async function deleteBook(id) {
  return request(`${BOOKS_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

export async function requestEditAccess(bookId) {
  return request(`${BOOKS_BASE_URL}/${bookId}/edit-requests`, {
    method: 'POST',
  });
}

export async function fetchPendingEditRequests(bookId) {
  return request(`${BOOKS_BASE_URL}/${bookId}/edit-requests`);
}

export async function approveEditRequest(bookId, requestId) {
  return request(`${BOOKS_BASE_URL}/${bookId}/edit-requests/${requestId}/approve`, {
    method: 'PUT',
  });
}

export async function denyEditRequest(bookId, requestId) {
  return request(`${BOOKS_BASE_URL}/${bookId}/edit-requests/${requestId}/deny`, {
    method: 'PUT',
  });
}
