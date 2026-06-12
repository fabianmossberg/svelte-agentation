import { describe, it, expect } from 'vitest';
import type {
	Annotation,
	OutputDetailLevel,
	ReactComponentMode,
	Session,
	SessionWithAnnotations,
	ThreadMessage
} from './types.js';

// Compat shape test (issue #6). An upstream-shaped fixture with EVERY optional
// field populated — including the React-only fields (`reactComponents`,
// `sourceFile`) and the local-only `_syncedTo` — must assign to our
// `Annotation` type. If the port renamed, dropped, or retyped a field this
// stops compiling, which `pnpm check` turns into a CI failure.
describe('types compat shape', () => {
	it('accepts a fully-populated upstream-shaped Annotation', () => {
		const annotation: Annotation = {
			id: 'a1',
			x: 50,
			y: 120,
			comment: 'fix this',
			element: 'button.primary',
			elementPath: 'body > main > button',
			timestamp: 1_700_000_000_000,
			selectedText: 'Submit',
			boundingBox: { x: 10, y: 20, width: 100, height: 40 },
			nearbyText: 'Submit your form',
			cssClasses: 'primary large',
			nearbyElements: '<form> <input>',
			computedStyles: 'color: red;',
			fullPath: 'html > body > main > button',
			accessibility: 'role=button',
			isMultiSelect: true,
			isFixed: false,
			reactComponents: '<App> <Form> <Button>',
			sourceFile: 'src/Button.tsx:42',
			drawingIndex: 3,
			elementBoundingBoxes: [{ x: 0, y: 0, width: 10, height: 10 }],
			kind: 'placement',
			placement: {
				componentType: 'card',
				width: 200,
				height: 150,
				scrollY: 80,
				text: 'A new card here'
			},
			rearrange: {
				selector: '.card',
				label: 'Card',
				tagName: 'DIV',
				originalRect: { x: 0, y: 0, width: 100, height: 100 },
				currentRect: { x: 50, y: 50, width: 100, height: 100 }
			},
			sessionId: 's1',
			url: 'https://example.com/page',
			intent: 'fix',
			severity: 'blocking',
			status: 'pending',
			thread: [{ id: 't1', role: 'human', content: 'please fix', timestamp: 1 }],
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
			resolvedAt: '2026-01-03T00:00:00.000Z',
			resolvedBy: 'agent',
			authorId: 'user-1',
			_syncedTo: 'session-9'
		};

		expect(annotation.id).toBe('a1');
		expect(annotation.reactComponents).toBe('<App> <Form> <Button>');
		expect(annotation.sourceFile).toBe('src/Button.tsx:42');
		expect(annotation._syncedTo).toBe('session-9');
	});

	it('accepts a minimal Annotation (only required fields)', () => {
		const annotation: Annotation = {
			id: 'a2',
			x: 0,
			y: 0,
			comment: '',
			element: 'div',
			elementPath: 'div',
			timestamp: 0
		};

		expect(annotation.kind).toBeUndefined();
	});

	it('exports the absorbed output enums', () => {
		const detail: OutputDetailLevel = 'forensic';
		const mode: ReactComponentMode = 'smart';

		expect(detail).toBe('forensic');
		expect(mode).toBe('smart');
	});

	it('accepts Session, SessionWithAnnotations and ThreadMessage shapes', () => {
		const message: ThreadMessage = {
			id: 't1',
			role: 'agent',
			content: 'done',
			timestamp: 2
		};

		const session: Session = {
			id: 's1',
			url: 'https://example.com',
			status: 'active',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-02T00:00:00.000Z',
			projectId: 'p1',
			metadata: { region: 'eu' }
		};

		const withAnnotations: SessionWithAnnotations = {
			...session,
			annotations: []
		};

		expect(message.role).toBe('agent');
		expect(session.status).toBe('active');
		expect(withAnnotations.annotations).toHaveLength(0);
	});
});
