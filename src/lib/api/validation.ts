import { env } from '$env/dynamic/public';

// Sentinel session token used when a score is recorded without a live server session.
export const OFFLINE_SESSION_TOKEN = 'offline';

// NOTE: The validation hash generated here uses PUBLIC_SHARED_CLIENT_SALT, which
// is compiled into the client-side bundle and is publicly discoverable.
// Consequently, this hash is client-forgeable by design. It serves as a light
// speed-bump against casual API submission tempering. Any actual security boundary
// or strict anti-cheat verification must be implemented server-side by checking
// session freshness, rate limiting, and plausibility of the milestone timeline.
export async function calculateValidationHash(
	username: string,
	finalScore: number,
	sessionToken: string,
	milestones: unknown[]
): Promise<string> {
	const payloadString = `${username}:${finalScore}:${sessionToken}:${JSON.stringify(milestones)}:${env.PUBLIC_SHARED_CLIENT_SALT}`;
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(payloadString);
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b): string => b.toString(16).padStart(2, '0')).join('');
}
