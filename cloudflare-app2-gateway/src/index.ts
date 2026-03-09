interface Env {
	RAILWAY_ORIGIN: string;
	CF_PAGES_ORIGIN: string;
	ORIGIN_TIMEOUT: string;
}

function addCorsHeaders(headers: Headers, request: Request): Headers {
	const origin = request.headers.get("Origin");
	if (origin) {
		headers.set("Access-Control-Allow-Origin", origin);
		headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		headers.set("Access-Control-Allow-Headers", "Content-Type");
		headers.set("Access-Control-Expose-Headers", "x-served-from");
	}
	return headers;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			const headers = new Headers();
			addCorsHeaders(headers, request);
			return new Response(null, { status: 204, headers });
		}

		const url = new URL(request.url);
		const timeout = parseInt(env.ORIGIN_TIMEOUT) || 3000;

		// Try Railway first
		const railwayResponse = await fetchWithTimeout(
			env.RAILWAY_ORIGIN + url.pathname + url.search,
			request,
			timeout
		);

		if (railwayResponse && railwayResponse.ok) {
			const headers = new Headers(railwayResponse.headers);
			headers.set("x-served-from", "railway");
			addCorsHeaders(headers, request);
			return new Response(railwayResponse.body, {
				status: railwayResponse.status,
				headers,
			});
		}

		// Fallback to CF Pages
		const pagesResponse = await fetchWithTimeout(
			env.CF_PAGES_ORIGIN + url.pathname + url.search,
			request,
			timeout
		);

		if (pagesResponse && pagesResponse.ok) {
			const headers = new Headers(pagesResponse.headers);
			headers.set("x-served-from", "cf-pages-fallback");
			addCorsHeaders(headers, request);
			return new Response(pagesResponse.body, {
				status: pagesResponse.status,
				headers,
			});
		}

		// Everything failed
		const headers = new Headers({ "content-type": "text/plain" });
		addCorsHeaders(headers, request);
		return new Response("All origins are currently unavailable. Please try again later.", {
			status: 502,
			headers,
		});
	},
};

async function fetchWithTimeout(
	url: string,
	originalRequest: Request,
	timeoutMs: number
): Promise<Response | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method: originalRequest.method,
			headers: originalRequest.headers,
			body: originalRequest.method !== "GET" && originalRequest.method !== "HEAD"
				? originalRequest.body
				: undefined,
			signal: controller.signal,
			redirect: "follow",
		});
		return response;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
