import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginFullscreen } from 'expressive-code-fullscreen';

/** @type {import('@astrojs/starlight/expressive-code').StarlightExpressiveCodeOptions} */
export default {
  plugins: [pluginCollapsibleSections(), pluginFullscreen()],
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
