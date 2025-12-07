/**
 * PostCSS plugin to scope CSS rules under `.opencor-scoped-styles`. This prevents CSS leakage when OpenCOR is used in
 * an application that uses another UI framework than PrimeVue (e.g., Bootstrap, Element Plus, Vuetify).
 */

export default function postcssScopePlugin(opts = {}) {
  const scopeSelector = opts.scopeSelector || '.opencor-scoped-styles';
  const shouldScope = opts.shouldScope || (() => true);

  return {
    postcssPlugin: 'postcss-scope-plugin',

    Rule(rule) {
      // Skip if custom filter says no.

      if (!shouldScope(rule)) {
        return;
      }

      // Skip if already scoped.

      const selectors = rule.selector.split(',').map((s) => s.trim());

      if (selectors.every((s) => s.startsWith(scopeSelector))) {
        return;
      }

      // Skip @-rules (like @keyframes, @media, etc.; they will be handled by their parent).

      if (
        rule.parent?.type === 'atrule' &&
        ['keyframes', 'font-face', '-webkit-keyframes'].includes(rule.parent.name)
      ) {
        return;
      }

      // Handle `:root` specially (convert it to our scope selector).

      if (rule.selector === ':root') {
        rule.selector = scopeSelector;

        return;
      }

      // Handle `html` and `body` specially (convert them to our scope selector).

      if (rule.selector === 'html' || rule.selector === 'body') {
        rule.selector = scopeSelector;

        return;
      }

      // Split and scope each selector.

      const scopedSelectors = selectors.flatMap((selector) => {
        // If a selector starts with a pseudo (like `::before`, `:hover`) then scope it directly.

        if (selector.startsWith('::') || (selector.startsWith(':') && !selector.includes('('))) {
          return `${scopeSelector}${selector}`;
        }

        // Handle a universal selector specially (only as a descendant).

        if (selector === '*' || selector.startsWith('* ')) {
          return `${scopeSelector} ${selector}`;
        }

        // For simple class/id selectors (like `#app`, `.h-full`), we create both a compound and a descendant. This
        // allows utilities to work on the scoped element itself and its children. We only do this for selectors that
        // start with . or # and have no spaces.

        if ((selector.startsWith('.') || selector.startsWith('#')) && !selector.includes(' ')) {
          return [`${scopeSelector}${selector}`, `${scopeSelector} ${selector}`];
        }

        // For everything else (complex selectors, element selectors), we only create a descendant.

        return `${scopeSelector} ${selector}`;
      });

      rule.selector = scopedSelectors.join(', ');
    }
  };
}

postcssScopePlugin.postcss = true;
