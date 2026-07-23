// A simple CORS proxy handler for Cloudflare Workers (see https://workers.cloudflare.com/).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'false'
};

const extractTargetUrl = (url) => url.searchParams.get('url');

const isValidTargetUrl = (targetUrl) => {
  try {
    const parsedUrl = new URL(targetUrl);
    const allowedHosts = ['cellml.org', 'figshare.com', 'opencor.ws', 'physiomeproject.org'];
    const allowedExtensions = ['.cellml', '.sedml', '.omex', '.csv'];

    if (
      !allowedHosts.some((host) => parsedUrl.hostname.endsWith(host)) &&
      !allowedExtensions.some((extension) => parsedUrl.pathname.toLowerCase().endsWith(extension))
    ) {
      return false;
    }

    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

const forwardRequest = async (targetUrl, request) => {
  const forwardHeaders = new Headers(request.headers);

  for (const header of [
    'authorization',
    'cookie',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade'
  ]) {
    forwardHeaders.delete(header);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
  });

  const newHeaders = new Headers(response.headers);

  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
};

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204, // No Content.
          headers: CORS_HEADERS
        });
      }

      const targetUrl = extractTargetUrl(url);

      if (!targetUrl) {
        return new Response('Missing "url" query parameter.', { status: 400 });
      }

      if (!isValidTargetUrl(targetUrl)) {
        return new Response('Target URL is not allowed.', { status: 403 });
      }

      if (!['GET', 'POST'].includes(request.method)) {
        return new Response('Method not allowed.', { status: 405 });
      }

      return await forwardRequest(targetUrl, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return new Response(`An error occurred: ${message}`, { status: 500 });
    }
  }
};
