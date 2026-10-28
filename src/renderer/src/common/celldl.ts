import * as celldlEditor from '@celldl/editor';

import * as locApi from '../libopencor/locApi';

import * as common from './common';
import * as dependencies from './dependencies';

// Initialise the Python environment that is needed to generate CellML from a CellDL file.
// Note #1: this means downloading Pyodide and the Python packages that it needs (~23 MB), as well as an RDF module
//          (~6 MB), so we only do it when needed and only once.
// Note #2: this relies on the BG-RDF framework, which CellDL Editor only makes available once it has been initialised
//          (otherwise, bgRdfStatements() returns no statement), hence it must only be called once CellDL Editor has
//          been loaded.

let pythonInitialisation: Promise<void> | null = null;
let pythonInitialised = false;

export const isPythonInitialised = (): boolean => {
  return pythonInitialised;
};

export const initialisePython = (progress: (percent: number) => void): Promise<void> => {
  pythonInitialisation ??= (async () => {
    const [celldlRdf, pythonTools, pythonToolsWeb] = await Promise.all([
      import('@celldl/rdf'),
      import('@celldl/editor-python-tools'),
      import('@celldl/editor-python-tools/web')
    ]);

    if (!celldlEditor.editorInitialised()) {
      throw new Error('CellDL Editor has not been initialised.');
    }

    if (!celldlRdf.initialised()) {
      await celldlRdf.initialise();
    }

    // Load the Python packages ourselves, dependencies first, so that we can report some meaningful progress.
    // Note: @celldl/editor-python-tools loads the Python packages in alphabetical order and reports its progress as it
    //       goes, but its first package (bg2cellml) depends on all the other packages. So, loading it means loading
    //       all the packages, after which loading the other packages does nothing, meaning that the progress would go
    //       from 0% to 100% in one go.

    const pyodide = await pythonToolsWeb.loadInBrowser();
    const packages = pyodide.lockfile.packages;
    const orderedPackages = new Set<string>();
    const orderPackage = (pkg: string): void => {
      if (!orderedPackages.has(pkg)) {
        for (const dependency of packages[pkg]?.depends ?? []) {
          orderPackage(dependency);
        }

        orderedPackages.add(pkg);
      }
    };

    for (const pkg of Object.keys(packages).sort()) {
      orderPackage(pkg);
    }

    // Note: our last step is the setting up of the BG-RDF framework (by @celldl/editor-python-tools).

    const nbOfSteps = orderedPackages.size + 1;
    let crtStep = 0;

    for (const pkg of orderedPackages) {
      await pyodide.loadPackage(pkg, {
        messageCallback: () => {
          // Suppress Pyodide's loading messages.
        }
      });

      progress(Math.floor((100 * ++crtStep) / nbOfSteps));
    }

    await pythonTools.initialisePython(pyodide, {
      getRdfStatements: celldlEditor.bgRdfStatements,
      oximockRdfModule: celldlRdf.oxiRdfModule
    });

    progress(100);

    pythonInitialised = true;
  })().catch((error: unknown) => {
    // Something went wrong, so allow for another attempt.

    pythonInitialisation = null;

    throw error;
  });

  return pythonInitialisation;
};

// Generate CellML from the given CellDL file.

export interface ICellmlFromCelldl {
  cellml?: string;
  issues: string[];
}

export const cellmlFromCelldl = async (celldl: string, celldlFileName: string): Promise<ICellmlFromCelldl> => {
  const pythonTools = await import('@celldl/editor-python-tools');
  let res: unknown;

  try {
    // Note: the source URI must be a valid IRI, hence we encode our file name (which may, for instance, contain
    //       spaces).

    res = await pythonTools.celldl2cellml(celldl, {
      sourceUri: `https://celldl.org/cellml/${encodeURIComponent(celldlFileName)}`
    });
  } catch (error: unknown) {
    // Note: an issue raised by bg2cellml should be returned as an exception, but @celldl/editor-python-tools fails to
    //       do so (its Python code references an undefined variable), so we get a Python error which message is a
    //       traceback that includes the original issue. So, we extract the first exception from that traceback, if
    //       any, and only keep its message if it is a bg2cellml issue.

    const message = common.formatError(error);
    const exception = /^([\w.]+(?:Error|Exception|Issue)): (.+)$/m.exec(message);

    return {
      issues: [
        exception
          ? exception[1]?.endsWith('Issue')
            ? (exception[2] ?? '')
            : exception[0]
          : common.formatMessage(message)
      ]
    };
  }

  // Note: our result comes from Python, in which case it may be a Map rather than an object.

  const value = (key: string): unknown => {
    return res instanceof Map ? res.get(key) : (res as Record<string, unknown> | undefined)?.[key];
  };
  const cellml = value('cellml');
  const issues = value('issues');

  if (typeof cellml === 'string') {
    return {
      cellml,
      issues: []
    };
  }

  if (Array.isArray(issues) && issues.length) {
    return {
      issues: issues.map((issue) => String(issue))
    };
  }

  return {
    issues: [
      `An unexpected error occurred while generating CellML${value('exception') ? ` (${value('exception')})` : ''}.`
    ]
  };
};

// Create a COMBINE archive for the given CellML file, i.e. with the CellML file itself, a SED-ML file (which we get
// libOpenCOR to create for us), and the CellDL file from which the CellML file was generated.

export const combineArchive = (cellml: string, celldl: string): dependencies.Module => {
  const cellmlFile = new locApi.File(
    `${common.CELLML_PREFIX}${common.nextCellmlDataUrlNumber()}/model.cellml`,
    new TextEncoder().encode(cellml)
  );
  let sedml: string;

  try {
    const document = cellmlFile.document();

    // Note: our SED-ML file references our CellML file using its (URL-encoded) path, which we replace with the location
    //       of our CellML file in our COMBINE archive.

    try {
      sedml = document.serialise().replace(/(<model\b[^>]*\bsource=")[^"]*"/, '$1model.cellml"');
    } finally {
      document.release();
    }
  } finally {
    cellmlFile.release();
  }

  const res = new dependencies._jsZip();

  res.file(
    'manifest.xml',
    `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<omexManifest xmlns="http://identifiers.org/combine.specifications/omex-manifest">
  <content location="." format="http://identifiers.org/combine.specifications/omex"/>
  <content location="document.sedml" format="http://identifiers.org/combine.specifications/sed-ml" master="true"/>
  <content location="model.cellml" format="http://identifiers.org/combine.specifications/cellml"/>
  <content location="model.celldl" format="http://purl.org/NET/mediatypes/image/svg+xml"/>
</omexManifest>
`
  );
  res.file('document.sedml', sedml);
  res.file('model.cellml', cellml);
  res.file('model.celldl', celldl);

  return res;
};
