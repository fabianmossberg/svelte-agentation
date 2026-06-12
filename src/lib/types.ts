// =============================================================================
// Shared Types
// =============================================================================

export type Annotation = {
	id: string;
	x: number; // % of viewport width
	y: number; // px from top of document (absolute) OR viewport (if isFixed)
	comment: string;
	element: string;
	elementPath: string;
	timestamp: number;
	selectedText?: string;
	boundingBox?: { x: number; y: number; width: number; height: number };
	nearbyText?: string;
	cssClasses?: string;
	nearbyElements?: string;
	computedStyles?: string;
	fullPath?: string;
	accessibility?: string;
	isMultiSelect?: boolean; // true if created via drag selection
	isFixed?: boolean; // true if element has fixed/sticky positioning (marker stays fixed)
	reactComponents?: string; // React component hierarchy (e.g. "<App> <Dashboard> <Button>")
	sourceFile?: string; // Source file path from React _debugSource (dev mode only, e.g. "src/Button.tsx:42")
	drawingIndex?: number; // Index of linked draw stroke (if any)
	elementBoundingBoxes?: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
	}>; // Individual bounding boxes for multi-select hover highlighting

	// Annotation kind (defaults to "feedback" when undefined — backward compat)
	kind?: 'feedback' | 'placement' | 'rearrange';

	// Structured data for placement annotations
	placement?: {
		componentType: string;
		width: number;
		height: number;
		scrollY: number;
		text?: string;
	};

	// Structured data for rearrange annotations
	rearrange?: {
		selector: string;
		label: string;
		tagName: string;
		originalRect: { x: number; y: number; width: number; height: number };
		currentRect: { x: number; y: number; width: number; height: number };
	};

	// Protocol fields (added when syncing to server)
	sessionId?: string;
	url?: string;
	intent?: AnnotationIntent;
	severity?: AnnotationSeverity;
	status?: AnnotationStatus;
	thread?: ThreadMessage[];
	createdAt?: string;
	updatedAt?: string;
	resolvedAt?: string;
	resolvedBy?: 'human' | 'agent';
	authorId?: string;

	// Local-only sync tracking (not sent to server)
	_syncedTo?: string; // Session ID this annotation was synced to
};

// -----------------------------------------------------------------------------
// Annotation Enums
// -----------------------------------------------------------------------------

export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';
export type AnnotationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

// -----------------------------------------------------------------------------
// Output Enums
// -----------------------------------------------------------------------------

// DIVERGENCE(upstream): moved from components/page-toolbar-css/index.tsx —
// upstream declares this in the toolbar component, but every Phase 1 port
// (generate-output, toolbar settings) needs it without importing the 4.7k LOC
// component. See RESEARCH.md.
export type OutputDetailLevel = 'compact' | 'standard' | 'detailed' | 'forensic';

// DIVERGENCE(upstream): moved from components/page-toolbar-css/index.tsx —
// ReactComponentMode is now derived from outputDetail when reactEnabled is true.
export type ReactComponentMode = 'smart' | 'filtered' | 'all' | 'off';

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export type Session = {
	id: string;
	url: string;
	status: SessionStatus;
	createdAt: string;
	updatedAt?: string;
	projectId?: string;
	metadata?: Record<string, unknown>;
};

export type SessionStatus = 'active' | 'approved' | 'closed';

export type SessionWithAnnotations = Session & {
	annotations: Annotation[];
};

// -----------------------------------------------------------------------------
// Thread Messages
// -----------------------------------------------------------------------------

export type ThreadMessage = {
	id: string;
	role: 'human' | 'agent';
	content: string;
	timestamp: number;
};
