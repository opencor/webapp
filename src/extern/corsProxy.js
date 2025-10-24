// A simple CORS proxy handler for Cloudflare Workers (see https://workers.cloudflare.com/).

export default {
  async fetch(request) {
    try {
      // Make sure that a target URL was provided.

      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');

      if (targetUrl === null) {
        return new Response('Missing "url" query parameter.', { status: 400 });
      }

      // Validate and restrict the target URL.

      const parsedUrl = new URL(targetUrl);
      const allowedHosts = ['cellml.org', 'github.com', 'githubusercontent.com', 'opencor.ws', 'physiomeproject.org'];

      if (!allowedHosts.some((host) => parsedUrl.hostname.endsWith(host))) {
        return new Response('Target URL is not allowed.', { status: 403 });
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return new Response('Invalid target URL scheme.', { status: 400 });
      }

      // Handle the preflight OPTIONS request.

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204, // No Content.
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'false'
          }
        });
      }

      // Limit the methods that can be proxied.

      const allowedMethods = ['GET', 'POST'];

      if (!allowedMethods.includes(request.method)) {
        return new Response('Method not allowed.', { status: 405 });
      }

      // Forward the request to the target URL.

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

      const response = await fetch(
        new Request(targetUrl, {
          method: request.method,
          headers: forwardHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
        })
      );

      // Modify the response to include/correct CORS headers.

      const newHeaders = new Headers(response.headers);

      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      newHeaders.set('Access-Control-Allow-Credentials', 'false');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      // Something went wrong, so return a 500 response (i.e. an internal server error).

      let errorMessage = error.message.charAt(0).toLowerCase() + error.message.slice(1);

      if (!errorMessage.endsWith('.')) {
        errorMessage += '.';
      }

      return new Response(`An error occurred: ${errorMessage}`, { status: 500 });
    }
  }
};
