// A simple CORS proxy handler for Cloudflare Workers (see https://workers.cloudflare.com/).
// Note #1: the proxy accepts any target URL, but it only returns content that is a file that the app can open (i.e. a
//          CellML file, a SED-ML file, an OMEX file, or a CellDL file, see isCelldlFile()) or a CSV file (which the app
//          can use as external data in its Interactive view, see csvFileIssue()), and that is not too large (see
//          MAX_SIZE). Such content is returned as an opaque, sandboxed download, so that a browser never renders or
//          executes it.
// Note #2: the app tells us which kind of content it expects (see CONTENT_KINDS), so that we only return that kind of
//          content and, if we get something else, tell it what we expected (e.g., not mention CSV files when a file is
//          to be opened). The kind of content may not be given (e.g., by an older version of the app), in which case we
//          accept any of them.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'false'
};

const CONTENT_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/octet-stream',
  'Content-Security-Policy': "sandbox; default-src 'none'",
  'X-Content-Type-Options': 'nosniff'
};

const CONTENT_KINDS = {
  file: 'a CellML file, a SED-ML file, an OMEX file, or a CellDL file',
  csv: 'a CSV file'
};
const ANY_CONTENT = 'a CellML file, a SED-ML file, an OMEX file, a CellDL file, or a CSV file';

const SNIFF_SIZE = 64 * 1024; // 64 KB.
const MAX_XML_PROLOG_SIZE = 1024 * 1024; // 1 MB.
// Note: the prolog of an XML file (i.e. its XML declaration, processing instructions, comments, and document type
//       declaration) may be longer than SNIFF_SIZE (e.g., because of a long licence comment), in which case we read up
//       to MAX_XML_PROLOG_SIZE of it to find its root element (see forwardRequest()).
const MAX_CSV_HEAD_SIZE = 1024 * 1024; // 1 MB.
// Note: the header and first row of data of a CSV file may be longer than SNIFF_SIZE (e.g., because it has thousands of
//       columns), in which case we read up to MAX_CSV_HEAD_SIZE of it to check them (see forwardRequest()).
const MAX_SIZE = 32 * 1024 * 1024; // 32 MB.
// Note: an OMEX file, as well as some content which size we don't know in advance, needs to be fully read (see
//       forwardRequest()), which means holding two copies of it (i.e. the chunks we read and their concatenation, see
//       readChunks()), so MAX_SIZE must be small enough for at least two copies of it to fit in the memory available to
//       a Cloudflare Worker (i.e. 128 MB).

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;

const extractTargetUrl = (url) => {
  return url.searchParams.get('url');
};

const extractContentKind = (url) => {
  return url.searchParams.get('kind');
};

const isValidTargetUrl = (targetUrl) => {
  try {
    return ['http:', 'https:'].includes(new URL(targetUrl).protocol);
  } catch {
    return false;
  }
};

const concatenate = (chunks, length) => {
  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);

    offset += chunk.length;
  }

  return bytes;
};

// Give up on the server of the target URL if it stalls, i.e. if it doesn't send us the headers of its response or the
// next chunk of its content within STALL_TIMEOUT.
// Note: the app gives us much more time to respond than it gives a server it fetches a URL from directly since we may
//       need to fully read some content before responding (see fetchThroughCorsProxy() in
//       src/renderer/src/common/common.ts). So, without this, a server that stalls would keep the app waiting for a
//       long time before it tries to fetch the target URL directly. With it, the app can only be kept waiting that long
//       by a server that is slow, but still sending us its content.

const STALL_TIMEOUT = 30 * 1000; // 30 seconds.
const STALLED_MESSAGE = 'The server took too long to respond.';

class StalledError extends Error {
  constructor() {
    super(STALLED_MESSAGE);
  }
}

const withStallTimeout = async (promise, onStall) => {
  // Return what the given promise resolves to, unless it takes longer than STALL_TIMEOUT, in which case reject with a
  // StalledError and call the given function (to stop whatever the promise is waiting for).
  // Note: stopping what the promise is waiting for settles it (e.g., a cancelled read resolves as if the content had
  //       ended), so we must reject before doing so. Otherwise, the promise would win the race.

  let stallTimer;

  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        stallTimer = setTimeout(() => {
          reject(new StalledError());

          onStall();
        }, STALL_TIMEOUT);
      })
    ]);
  } finally {
    clearTimeout(stallTimer);
  }
};

const read = (reader) => {
  return withStallTimeout(reader.read(), () => {
    reader.cancel().catch(() => {});
  });
};

const readChunks = async (reader, maxSize, initialChunks = []) => {
  // Read chunks until (roughly) the given number of bytes, including those of the given initial chunks, has been
  // reached and let the caller know whether the end of the stream was reached.
  // Note: we don't concatenate the chunks, so that the caller can decide whether (and when) to do it, i.e. without
  //       having to hold more than two copies of the data at any given time (see MAX_SIZE).

  const chunks = [...initialChunks];
  let length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  let done = false;

  while (length < maxSize) {
    const result = await read(reader);

    if (result.done) {
      done = true;

      break;
    }

    chunks.push(result.value);

    length += result.value.length;
  }

  return { chunks, length, done };
};

const readBytes = async (reader, maxSize) => {
  // Read up to (roughly) the given number of bytes and let the caller know whether the end of the stream was reached.

  const { chunks, length, done } = await readChunks(reader, maxSize);

  return { bytes: concatenate(chunks, length), done };
};

const readMoreBytes = async (reader, head, maxSize) => {
  // Read more of some content, the start of which we have already read, i.e. up to (roughly) twice as many bytes (but
  // no more than the given number of bytes), and let the caller know whether the end of the stream was reached.

  const more = await readChunks(reader, Math.min(2 * head.length, maxSize), [head]);

  return { bytes: concatenate(more.chunks, more.length), done: more.done };
};

const readRest = async (reader, head) => {
  // Read the rest of some content, the start of which we have already read, and return all of it, unless it is too
  // large, in which case return null.
  // Note: we read (up to) one more byte than allowed, so that we know whether the content is too large, in which case
  //       we reject it without concatenating its chunks. Otherwise, we concatenate the start of the content and the
  //       rest of it in one go.

  const all = await readChunks(reader, MAX_SIZE + 1, [head]);

  if (all.length > MAX_SIZE) {
    await reader.cancel().catch(() => {});

    return null;
  }

  return concatenate(all.chunks, all.length);
};

const replayStream = (bytes, reader) => {
  // Return a stream that first outputs the given bytes (i.e. those we already read to check the content) and then the
  // rest of the given reader's data, unless there is too much data, in which case the stream errors.

  let size = bytes.length;

  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
    },
    async pull(controller) {
      // Note: we have already responded, so if the server stalls, all we can do is error our stream, which the app sees
      //       as a network error, in which case it fetches the target URL directly (see fetchThroughCorsProxy() in
      //       src/renderer/src/common/common.ts).

      let done;
      let value;

      try {
        ({ done, value } = await read(reader));
      } catch (error) {
        controller.error(error);

        return;
      }

      if (done) {
        controller.close();

        return;
      }

      size += value.length;

      if (size > MAX_SIZE) {
        await reader.cancel().catch(() => {});

        controller.error(new Error(TOO_LARGE_MESSAGE));

        return;
      }

      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
};

const isZipFile = (bytes) => {
  // Check that the given bytes are a ZIP file by looking for the local file header signature at the start of the file.

  return (
    bytes.length >= 4 &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) ===
      ZIP_LOCAL_FILE_HEADER_SIGNATURE
  );
};

const isOmexFile = (bytes) => {
  // An OMEX file is a ZIP file with a manifest.xml file at its root, so look for it in the ZIP file's central
  // directory.

  // Find the end of central directory record, which is at the end of the ZIP file, but may be followed by a comment of
  // up to 65,535 bytes.

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOfCentralDirectoryOffset = -1;

  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 22 - 0xffff); --offset) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endOfCentralDirectoryOffset = offset;

      break;
    }
  }

  if (endOfCentralDirectoryOffset === -1) {
    return false;
  }

  // Use the ZIP64 end of central directory record, if needed.

  let nbOfEntries = view.getUint16(endOfCentralDirectoryOffset + 10, true);
  let offset = view.getUint32(endOfCentralDirectoryOffset + 16, true);

  if (
    (nbOfEntries === 0xffff || offset === 0xffffffff) &&
    endOfCentralDirectoryOffset >= 20 &&
    view.getUint32(endOfCentralDirectoryOffset - 20, true) === ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE
  ) {
    const zip64EndOfCentralDirectoryOffset = Number(view.getBigUint64(endOfCentralDirectoryOffset - 12, true));

    if (
      zip64EndOfCentralDirectoryOffset + 56 > bytes.length ||
      view.getUint32(zip64EndOfCentralDirectoryOffset, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      return false;
    }

    nbOfEntries = Number(view.getBigUint64(zip64EndOfCentralDirectoryOffset + 32, true));
    offset = Number(view.getBigUint64(zip64EndOfCentralDirectoryOffset + 48, true));
  }

  // Look for a central directory entry with the name "manifest.xml".

  const textDecoder = new TextDecoder();

  for (let i = 0; i < nbOfEntries; ++i) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE) {
      return false;
    }

    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const fileCommentLength = view.getUint16(offset + 32, true);

    if (offset + 46 + fileNameLength > bytes.length) {
      return false;
    }

    if (textDecoder.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength)) === 'manifest.xml') {
      return true;
    }

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return false;
};

const xmlRootElement = (text) => {
  // Return the prefix, local name, and namespace of the root element of the given XML text, skipping its prolog (i.e.
  // its XML declaration, processing instructions, comments, and document type declaration), or null if there is no such
  // root element. If the given XML text ends before the start tag of its root element does, i.e. if it is only the
  // start of some XML text, then let the caller know that it is incomplete.

  const INCOMPLETE = { incomplete: true };

  const skipPast = (string, marker, from = 0) => {
    const index = string.indexOf(marker, from);

    return index === -1 ? null : string.slice(index + marker.length);
  };

  let rest = text;

  for (;;) {
    rest = rest.trimStart();

    if (rest.startsWith('<?')) {
      rest = skipPast(rest, '?>');
    } else if (rest.startsWith('<!--')) {
      rest = skipPast(rest, '-->');
    } else if (rest.startsWith('<!DOCTYPE')) {
      const internalSubsetStart = rest.indexOf('[');
      const declarationEnd = rest.indexOf('>');

      if (internalSubsetStart !== -1 && (declarationEnd === -1 || internalSubsetStart < declarationEnd)) {
        const internalSubsetEnd = rest.indexOf(']', internalSubsetStart);

        rest = internalSubsetEnd === -1 ? null : skipPast(rest, '>', internalSubsetEnd);
      } else {
        rest = skipPast(rest, '>');
      }
    } else {
      break;
    }

    if (rest === null) {
      return INCOMPLETE;
    }
  }

  const match = /^<(?:([\w.-]+):)?([\w.-]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/.exec(rest);

  if (!match) {
    // Note: our XML text is incomplete if it is empty (e.g., it only has some whitespace so far) or if it ends within a
    //       start tag (e.g., that of our root element or of something that is part of our prolog, like "<!DOC").

    return !rest || (rest.startsWith('<') && !rest.includes('>')) ? INCOMPLETE : null;
  }

  const [, prefix, name, attributes] = match;
  const namespaceAttribute = prefix ? `xmlns:${prefix}` : 'xmlns';

  for (const [, attribute, doubleQuotedValue, singleQuotedValue] of attributes.matchAll(
    /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  )) {
    if (attribute === namespaceAttribute) {
      return { prefix, name, namespace: doubleQuotedValue ?? singleQuotedValue };
    }
  }

  return { prefix, name, namespace: null };
};

const xmlEncoding = (bytes) => {
  // Return the encoding of the given XML bytes, as detected from their first bytes (see Appendix F of the XML
  // specification, https://www.w3.org/TR/xml/#sec-guessing), i.e. using a byte order mark or, failing that, the way the
  // start of an XML declaration ("<?") is encoded. We default to UTF-8 (whose byte order mark, if any, gets skipped by
  // TextDecoder).
  // Note: TextDecoder also skips a UTF-16 byte order mark, as long as it matches the given encoding.

  const [byte0, byte1, byte2, byte3] = bytes;

  if ((byte0 === 0xfe && byte1 === 0xff) || (byte0 === 0x00 && byte1 === 0x3c && byte2 === 0x00 && byte3 === 0x3f)) {
    return 'utf-16be';
  }

  if ((byte0 === 0xff && byte1 === 0xfe) || (byte0 === 0x3c && byte1 === 0x00 && byte2 === 0x3f && byte3 === 0x00)) {
    return 'utf-16le';
  }

  return 'utf-8';
};

const xmlText = (bytes) => {
  return new TextDecoder(xmlEncoding(bytes)).decode(bytes);
};

const isIncompleteXmlProlog = (bytes) => {
  return xmlRootElement(xmlText(bytes))?.incomplete === true;
};

const isCellmlOrSedmlFile = (bytes) => {
  const rootElement = xmlRootElement(xmlText(bytes));

  if (!rootElement?.namespace) {
    return false;
  }

  return (
    (rootElement.name === 'model' && rootElement.namespace.startsWith('http://www.cellml.org/cellml/')) ||
    (rootElement.name === 'sedML' && rootElement.namespace.startsWith('http://sed-ml.org/'))
  );
};

const isSvgFile = (bytes) => {
  // Check that the given bytes are an SVG file, i.e. that their root element is an unprefixed svg element, as the app
  // requires (see isCellDLFile() in src/renderer/src/common/locCommon.ts).
  // Note: an SVG file could have a prefixed root element (e.g., <svg:svg xmlns:svg="http://www.w3.org/2000/svg">), but
  //       the app would then not recognise it as a CellDL file, so we would return a file that it cannot open in its
  //       CellDL Editor.

  const rootElement = xmlRootElement(xmlText(bytes));

  return rootElement?.name === 'svg' && !rootElement.prefix;
};

const hasCelldlMetadata = (bytes) => {
  return /\bid\s*=\s*["']celldl-rdf-metadata["']/.test(xmlText(bytes));
};

const isCelldlFile = (bytes) => {
  // Check that the given bytes are a CellDL file, i.e. an SVG file with some CellDL metadata, as the app does (see
  // isCellDLFile() in src/renderer/src/common/locCommon.ts).
  // Note: the CellDL metadata is normally at the start of a CellDL file (i.e. it is the first child of its root
  //       element), but it may not be, in which case we may only find it once we have read the whole file (see
  //       forwardRequest()).

  return isSvgFile(bytes) && hasCelldlMetadata(bytes);
};

const csvFileIssue = (bytes, complete) => {
  // Check that the given bytes are a CSV file, i.e. text (without control characters other than tabs and line breaks)
  // that looks like a CSV file as expected by the app, i.e. lines are separated by line breaks and values by commas,
  // there are at least two lines (i.e. a header and some data), and every line has the same number of values, which
  // must be at least two (i.e. a VOI column and a data column). Like the app, we decode the text as UTF-8 (replacing
  // invalid byte sequences, like Response.text() does), trim lines, and skip blank lines. If the given bytes are a CSV
  // file, then return null. Otherwise, return why they are not (worded like in parseExternalCsvData(), so that the user
  // gets told the same thing whether the app or we find the issue) and whether more bytes are needed to tell.
  // Note #1: if we only have the start of the CSV file, then we ignore its last (and likely incomplete) line.
  // Note #2: we check the text even if the URL has a .csv extension. Indeed, we accept any target URL, so we would
  //          otherwise return almost any text from anywhere (e.g., https://example.com/anything.csv), i.e. act as a
  //          general CORS proxy for text. The app can still tell the user why a CSV file cannot be used if the issue is
  //          with its values (e.g., a non-numeric value, see parseExternalCsvData()) since we don't check them.

  const text = new TextDecoder().decode(bytes, { stream: !complete });

  // biome-ignore lint/suspicious/noControlCharactersInRegex: we are looking for control characters.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    return { message: 'it is not a text file', incomplete: false };
  }

  const lines = text.split(/\r?\n/);

  if (!complete) {
    lines.pop();
  }

  let nbOfRows = 0;
  let nbOfColumns = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const nbOfValues = trimmedLine.split(',').length;

    ++nbOfRows;

    if (nbOfRows === 1) {
      if (nbOfValues < 2) {
        return { message: 'its header does not have at least two columns', incomplete: false };
      }

      nbOfColumns = nbOfValues;
    } else if (nbOfValues !== nbOfColumns) {
      return {
        message: `its row #${nbOfRows} does not have the same number of columns as its header, i.e. ${nbOfColumns}, not ${nbOfValues}`,
        incomplete: false
      };
    }
  }

  if (nbOfRows < 2) {
    return complete
      ? { message: 'it does not have a header and at least one row of data', incomplete: false }
      : { message: 'its header and first row of data are too long', incomplete: true };
  }

  return null;
};

const errorResponse = (message, status) => {
  // Note: our error responses must also have our CORS headers, so that a browser lets the app know why we failed.

  return new Response(message, {
    status,
    headers: CONTENT_HEADERS
  });
};

const errorMessage = (error) => {
  return (error instanceof Error ? error.message : String(error)).replace(/\.+$/, '');
};

// Note: our messages may be shown as is to people (e.g., in a toast, when a file cannot be opened), so they are about
//       the file that people asked for rather than about our "target" content or URL.

const TOO_LARGE_MESSAGE = `The file is too large (more than ${MAX_SIZE / (1024 * 1024)} MB).`;

const rejectedResponse = (message) => {
  return errorResponse(message, 403);
};

const hasKnownSize = (response) => {
  // Check whether the size of the given response's content is known in advance, i.e. whether it has a content length
  // and its content is not compressed.
  // Note: if the content is compressed, then fetch() decompresses it for us, but the content length is that of the
  //       compressed content.

  const contentEncoding = response.headers.get('content-encoding');

  return (
    /^\d+$/.test(response.headers.get('content-length') ?? '') &&
    (!contentEncoding || contentEncoding.toLowerCase() === 'identity')
  );
};

const forwardRequest = async (targetUrl, contentKind, request) => {
  const filesAccepted = contentKind !== 'csv';
  const csvFilesAccepted = contentKind !== 'file';

  const forwardHeaders = new Headers(request.headers);

  for (const header of [
    'authorization',
    'cookie',
    'connection',
    'if-range',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'range',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade'
  ]) {
    forwardHeaders.delete(header);
  }

  const fetchAbortController = new AbortController();
  const response = await withStallTimeout(
    fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders,
      signal: fetchAbortController.signal
    }),
    () => {
      fetchAbortController.abort();
    }
  );

  // Note: we don't return the body of an error response since it is likely to be an HTML page, so we cancel it rather
  //       than leave it unread. We ignore any issue with cancelling it since we can still let the app know about the
  //       error.

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});

    return new Response(null, {
      status: response.status,
      headers: CONTENT_HEADERS
    });
  }

  if (!response.body) {
    return rejectedResponse('The file is empty.');
  }

  // Reject content that we know is too large.
  // Note: the content length may not be known or, if the content is compressed, it may be smaller than the actual size
  //       of the content, so we also check the size of the content as we read it.

  if (Number(response.headers.get('content-length')) > MAX_SIZE) {
    await response.body.cancel().catch(() => {});

    return rejectedResponse(TOO_LARGE_MESSAGE);
  }

  // A CellML, SED-ML, CellDL, or CSV file only needs its start to be checked, after which it can be streamed, but only
  // if we know that it isn't too large (see above). Otherwise, we need to fully read it first, so that we can reject it
  // if it is too large. Indeed, once we have started streaming it, all we could do is abort it, which the app would see
  // as a network error rather than as a rejection, so it wouldn't try to fetch the target URL directly instead (see
  // fetchThroughCorsProxy() in src/renderer/src/common/common.ts).
  // Note: when streaming, we still check the size of the content as we read it, in case the content length is wrong
  //       (see replayStream()).

  const reader = response.body.getReader();
  let { bytes: head, done } = await readBytes(reader, SNIFF_SIZE);

  // Reject empty content, i.e. a response that has a body, but one that turns out to be empty (see above).

  if (done && !head.length) {
    return rejectedResponse('The file is empty.');
  }

  // Read more of the content if it is an XML file which prolog is longer than what we have read so far (see
  // MAX_XML_PROLOG_SIZE).

  while (!done && head.length < MAX_XML_PROLOG_SIZE && isIncompleteXmlProlog(head)) {
    ({ bytes: head, done } = await readMoreBytes(reader, head, MAX_XML_PROLOG_SIZE));
  }

  const isAcceptedFile = filesAccepted && (isCellmlOrSedmlFile(head) || isCelldlFile(head));
  let csvIssue = null;

  if (!isAcceptedFile && csvFilesAccepted) {
    csvIssue = csvFileIssue(head, done);

    // Read more of the content if it may be a CSV file which header and first row of data are longer than what we have
    // read so far (see MAX_CSV_HEAD_SIZE).

    while (csvIssue?.incomplete && !done && head.length < MAX_CSV_HEAD_SIZE) {
      ({ bytes: head, done } = await readMoreBytes(reader, head, MAX_CSV_HEAD_SIZE));

      csvIssue = csvFileIssue(head, done);
    }
  }

  if (isAcceptedFile || (csvFilesAccepted && !csvIssue)) {
    if (done || hasKnownSize(response)) {
      return new Response(done ? head : replayStream(head, reader), {
        status: response.status,
        headers: CONTENT_HEADERS
      });
    }

    const bytes = await readRest(reader, head);

    if (!bytes) {
      return rejectedResponse(TOO_LARGE_MESSAGE);
    }

    return new Response(bytes, {
      status: response.status,
      headers: CONTENT_HEADERS
    });
  }

  // An SVG file which CellDL metadata, if any, is not at its start needs to be fully read to know whether it is a
  // CellDL file (see isCelldlFile()).

  if (filesAccepted && isSvgFile(head)) {
    const bytes = done ? head : await readRest(reader, head);

    if (!bytes) {
      return rejectedResponse(TOO_LARGE_MESSAGE);
    }

    if (!hasCelldlMetadata(bytes)) {
      return rejectedResponse('The file is an SVG file, but not a CellDL file.');
    }

    return new Response(bytes, {
      status: response.status,
      headers: CONTENT_HEADERS
    });
  }

  // An OMEX file needs to be fully read since we need its central directory, which is at the end of the file.

  if (!filesAccepted || !isZipFile(head)) {
    await reader.cancel().catch(() => {});

    // Note: we only say why the content is not a CSV file if a CSV file is all that the app expects. Otherwise, the
    //       content is likely meant to be some other kind of file, so why it is not a CSV file would be confusing.

    const csvIssueMessage = contentKind === 'csv' && csvIssue ? ` (${csvIssue.message})` : '';

    return rejectedResponse(`The file is not ${CONTENT_KINDS[contentKind] ?? ANY_CONTENT}${csvIssueMessage}.`);
  }

  const bytes = done ? head : await readRest(reader, head);

  if (!bytes) {
    return rejectedResponse(TOO_LARGE_MESSAGE);
  }

  if (!isOmexFile(bytes)) {
    return rejectedResponse('The file is a ZIP file, but not an OMEX file (it has no manifest.xml file).');
  }

  return new Response(bytes, {
    status: response.status,
    headers: CONTENT_HEADERS
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
        return errorResponse('Missing "url" query parameter.', 400);
      }

      if (!isValidTargetUrl(targetUrl)) {
        return errorResponse('The URL is not an HTTP or HTTPS URL.', 403);
      }

      const contentKind = extractContentKind(url);

      if (contentKind !== null && !Object.hasOwn(CONTENT_KINDS, contentKind)) {
        return errorResponse('Invalid "kind" query parameter.', 400);
      }

      if (request.method !== 'GET') {
        return errorResponse('Method not allowed.', 405);
      }

      // Note: we may not be able to fetch the target URL (e.g., it is only reachable from the user's network) or its
      //       server may stall (see STALL_TIMEOUT), in which case the app may still be able to fetch it directly, so we
      //       let it know using an HTTP 502 or 504 error, respectively.

      try {
        return await forwardRequest(targetUrl, contentKind, request);
      } catch (error) {
        if (error instanceof StalledError) {
          return errorResponse(STALLED_MESSAGE, 504);
        }

        return errorResponse(`The file could not be retrieved (${errorMessage(error)}).`, 502);
      }
    } catch (error) {
      return errorResponse(`An unexpected error occurred (${errorMessage(error)}).`, 500);
    }
  }
};
