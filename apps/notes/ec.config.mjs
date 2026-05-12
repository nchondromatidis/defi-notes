import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';

/** @type {import('@astrojs/starlight/expressive-code').StarlightExpressiveCodeOptions} */
export default {
  plugins: [pluginCollapsibleSections()],
  defaultProps: {
    collapseStyle: 'collapsible-auto',
  },
  styleOverrides: {
    collapsibleSections: {
      openBackgroundColor: 'transparent',
      openBackgroundColorCollapsible: 'transparent',
      openBorderColor: 'transparent',
    },
  },
};
