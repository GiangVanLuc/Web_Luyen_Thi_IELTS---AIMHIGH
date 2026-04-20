# Fetch API Patterns (Vanilla JS -> Spring Boot)

## Mục tiêu
- Tập trung hóa mọi HTTP call để đồng nhất auth, error handling và logging.

## Core Rules
- All HTTP calls go through one shared helper in `js/api.js` (no direct fetch in page files).
- Always send `Authorization: Bearer <token>` if endpoint requires authentication.
- Default headers for JSON APIs: `Accept: application/json` and `Content-Type: application/json`.
- Include `credentials: 'include'` only when backend uses cookie-based auth; keep strategy consistent.

## Standard Request Wrapper
```js
const API_BASE = 'http://localhost:8080/api';

export async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;
  if (!res.ok) throw normalizeHttpError(res.status, payload);
  return payload;
}
```

## Error Handling and Auth Flow
- Normalize backend errors into a stable object: `{ status, code, message, details }`.
- Handle `401` globally: clear invalid token, redirect to `login.html`, keep return URL.
- Handle `403` with permission message; do not retry automatically.
- Handle `422/400` by mapping validation errors to form fields.
- Handle `5xx` with fallback message and optional retry button.

## Reliability Patterns
- Use `AbortController` for canceling stale requests when user changes page/filter quickly.
- Prevent double-submit by disabling buttons while request is pending.
- Add request timeout wrapper for long-running APIs (for example 10-15s).
- Log only non-sensitive diagnostics; never print JWT or passwords in console.

## AimHigh-Specific Conventions
- Token source key: `aimhigh_token` in localStorage.
- Endpoint naming follows backend resources (`/exams`, `/attempts/{id}/submit`, `/user-vocabulary`).
- Expect backend envelope consistency so UI can read `payload.data` predictably.

## Anti-pattern cần tránh
- Gọi `fetch` trực tiếp rải rác trong từng page script.
- Parse lỗi mỗi nơi một kiểu dẫn tới UI xử lý không nhất quán.
- Retry tự động cho lỗi quyền (`401`, `403`) gây vòng lặp.

## Checklist review PR
- Có call API mới nào đi ngoài helper `js/api.js` không.
- API call có timeout và cancel strategy phù hợp chưa.
- Lỗi validate đã map về field UI chưa.
