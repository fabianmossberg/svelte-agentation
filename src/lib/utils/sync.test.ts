import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createSession,
	deleteAnnotation,
	getSession,
	listSessions,
	requestAction,
	syncAnnotation,
	updateAnnotation
} from './sync.js';
import type { Annotation, Session, SessionWithAnnotations } from '../types.js';

// These are new tests (upstream ships none for this module).
//
// `sync.ts` is a pure-`fetch` client for the Agentation server protocol. Each
// test mocks the global `fetch` and asserts the exact wire contract — URL path,
// HTTP method, headers, JSON body — that upstream's unmodified server expects,
// so these double as protocol documentation (issue #11). The module never
// catches: on a non-2xx response it throws a status-bearing error, and on a
// network error the rejection propagates untouched. That propagation IS the
// "local-only fallback" contract — the toolbar caller (Phase 4) catches and
// degrades; this layer's job is only to surface the failure faithfully.

const ENDPOINT = 'https://agentation.test/api';

/** A `fetch` Response stub: only the fields `sync.ts` actually reads. */
function okResponse(payload: unknown) {
	return { ok: true, status: 200, json: async () => payload } as Response;
}
function errorResponse(status: number) {
	// `json` is present but should never be called on the error path.
	return {
		ok: false,
		status,
		json: async () => {
			throw new Error('json() must not be read on a non-ok response');
		}
	} as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// A minimal but schema-valid annotation for body-shape assertions.
const annotation: Annotation = {
	id: 'anno-1',
	x: 50,
	y: 120,
	comment: 'fix this',
	element: 'button',
	elementPath: 'body > main > button',
	timestamp: 1700000000000
};

const session: Session = {
	id: 'sess-1',
	url: 'https://app.test/page',
	status: 'active',
	createdAt: '2026-01-01T00:00:00.000Z'
};

describe('listSessions', () => {
	it('GETs /sessions and returns the parsed array', async () => {
		const sessions: Session[] = [session];
		fetchMock.mockResolvedValue(okResponse(sessions));

		const result = await listSessions(ENDPOINT);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/sessions`);
		expect(result).toEqual(sessions);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(500));
		await expect(listSessions(ENDPOINT)).rejects.toThrow('Failed to list sessions: 500');
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(listSessions(ENDPOINT)).rejects.toThrow('Failed to fetch');
	});
});

describe('createSession', () => {
	it('POSTs /sessions with a JSON { url } body and returns the session', async () => {
		fetchMock.mockResolvedValue(okResponse(session));

		const result = await createSession(ENDPOINT, 'https://app.test/page');

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/sessions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: 'https://app.test/page' })
		});
		expect(result).toEqual(session);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(422));
		await expect(createSession(ENDPOINT, 'x')).rejects.toThrow('Failed to create session: 422');
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(createSession(ENDPOINT, 'x')).rejects.toThrow('Failed to fetch');
	});
});

describe('getSession', () => {
	it('GETs /sessions/:id and returns the session with annotations', async () => {
		const payload: SessionWithAnnotations = { ...session, annotations: [annotation] };
		fetchMock.mockResolvedValue(okResponse(payload));

		const result = await getSession(ENDPOINT, 'sess-1');

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/sessions/sess-1`);
		expect(result).toEqual(payload);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(404));
		await expect(getSession(ENDPOINT, 'sess-1')).rejects.toThrow('Failed to get session: 404');
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(getSession(ENDPOINT, 'sess-1')).rejects.toThrow('Failed to fetch');
	});
});

describe('syncAnnotation', () => {
	it('POSTs /sessions/:id/annotations with the annotation body', async () => {
		const returned: Annotation = { ...annotation, sessionId: 'sess-1' };
		fetchMock.mockResolvedValue(okResponse(returned));

		const result = await syncAnnotation(ENDPOINT, 'sess-1', annotation);

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/sessions/sess-1/annotations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(annotation)
		});
		expect(result).toEqual(returned);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(500));
		await expect(syncAnnotation(ENDPOINT, 'sess-1', annotation)).rejects.toThrow(
			'Failed to sync annotation: 500'
		);
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(syncAnnotation(ENDPOINT, 'sess-1', annotation)).rejects.toThrow('Failed to fetch');
	});
});

describe('updateAnnotation', () => {
	it('PATCHes /annotations/:id with the partial body', async () => {
		const patch: Partial<Annotation> = { status: 'resolved' };
		const returned: Annotation = { ...annotation, status: 'resolved' };
		fetchMock.mockResolvedValue(okResponse(returned));

		const result = await updateAnnotation(ENDPOINT, 'anno-1', patch);

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/annotations/anno-1`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		expect(result).toEqual(returned);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(409));
		await expect(updateAnnotation(ENDPOINT, 'anno-1', {})).rejects.toThrow(
			'Failed to update annotation: 409'
		);
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(updateAnnotation(ENDPOINT, 'anno-1', {})).rejects.toThrow('Failed to fetch');
	});
});

describe('deleteAnnotation', () => {
	it('DELETEs /annotations/:id and resolves to undefined without reading the body', async () => {
		fetchMock.mockResolvedValue(okResponse(undefined));

		const result = await deleteAnnotation(ENDPOINT, 'anno-1');

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/annotations/anno-1`, {
			method: 'DELETE'
		});
		expect(result).toBeUndefined();
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(404));
		await expect(deleteAnnotation(ENDPOINT, 'anno-1')).rejects.toThrow(
			'Failed to delete annotation: 404'
		);
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(deleteAnnotation(ENDPOINT, 'anno-1')).rejects.toThrow('Failed to fetch');
	});
});

describe('requestAction', () => {
	it('POSTs /sessions/:id/action with an { output } body and returns delivery info', async () => {
		const response = {
			success: true,
			annotationCount: 3,
			delivered: { sseListeners: 1, webhooks: 2, total: 3 }
		};
		fetchMock.mockResolvedValue(okResponse(response));

		const result = await requestAction(ENDPOINT, 'sess-1', '# markdown output');

		expect(fetchMock).toHaveBeenCalledWith(`${ENDPOINT}/sessions/sess-1/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ output: '# markdown output' })
		});
		expect(result).toEqual(response);
	});

	it('throws with the status on a non-ok response', async () => {
		fetchMock.mockResolvedValue(errorResponse(503));
		await expect(requestAction(ENDPOINT, 'sess-1', 'x')).rejects.toThrow(
			'Failed to request action: 503'
		);
	});

	it('propagates a network error (local-only fallback contract)', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(requestAction(ENDPOINT, 'sess-1', 'x')).rejects.toThrow('Failed to fetch');
	});
});
