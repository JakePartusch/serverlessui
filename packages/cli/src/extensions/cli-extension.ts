import { GluegunToolbox } from 'gluegun'
const path = require.resolve('@jakepartusch/notlify-application')

// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = (toolbox: GluegunToolbox) => {
  toolbox.getApplicationFileReference = () => {
    return path
  }

  // enable this if you want to read configuration in from
  // the current folder's package.json (in a "cli" property),
  // cli.config.json, etc.
  // toolbox.config = {
  //   ...toolbox.config,
  //   ...toolbox.config.loadConfig("cli", process.cwd())
  // }
}
