import { auth } from '../firebase/config';
import { signOut } from '../firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const token = await auth.currentUser?.getIdToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      await signOut();
      throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
    }

    if (response.status >= 500) {
      throw new ApiError(response.status, 'Erro no servidor. Tente novamente mais tarde.');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as any;
      throw new ApiError(response.status, body.message ?? 'Erro desconhecido.');
    }

    if (response.status === 204) return undefined as unknown as T;
    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo esgotado. Verifique sua conexão.');
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  deleteBody: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'DELETE', body: JSON.stringify(body) }),
};
