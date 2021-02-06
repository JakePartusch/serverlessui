import { GluegunToolbox } from 'gluegun'
const serverlessApplicationPath = require.resolve(
  '@jakepartusch/notlify-serverless-application'
)
const domainApplicationPath = require.resolve(
  '@jakepartusch/notlify-serverless-application'
)

// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = (toolbox: GluegunToolbox) => {
  toolbox.getServerlessApplicationFileReference = () => {
    return serverlessApplicationPath
  }

  toolbox.getDomainApplicationFileReference = () => {
    return domainApplicationPath
  }

  // enable this if you want to read configuration in from
  // the current folder's package.json (in a "cli" property),
  // cli.config.json, etc.
  // toolbox.config = {
  //   ...toolbox.config,
  //   ...toolbox.config.loadConfig("cli", process.cwd())
  // }
}
