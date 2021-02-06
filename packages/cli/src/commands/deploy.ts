import { GluegunCommand } from 'gluegun'
import * as glob from 'glob'
import * as child_process from 'child_process'

const command: GluegunCommand = {
  name: 'deploy',
  alias: 'd',
  description: 'Deploy your website and serverless functions',
  run: async (toolbox) => {
    const { parameters, getApplicationFileReference } = toolbox

    const { options } = parameters

    const {
      domain,
      functions = './functions',
      dir = './dist',
      prod = false,
    } = options
    const files = glob.sync(`${functions}/**/*.{js,ts}`)

    const apiFiles = files.join(',')
    const applicationFile = getApplicationFileReference()
    const domainCli = domain ? `-c domainName=${domain}` : ''
    const prodCli = prod ? '-c prod=true' : ''

    child_process.execSync(
      `cdk synth ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --quiet`,
      {
        stdio: 'inherit',
      }
    )

    child_process.execSync(
      `cdk deploy ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --require-approval never`,
      {
        stdio: 'inherit',
      }
    )
  },
}

module.exports = command
