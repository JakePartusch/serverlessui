import { GluegunCommand } from 'gluegun'
import * as glob from 'glob'
import * as child_process from 'child_process'
import { cosmiconfigSync } from 'cosmiconfig'
const serverlessApplicationPath = require.resolve(
  '@serverlessui/serverless-app'
)

export const command: GluegunCommand = {
  name: 'deploy',
  alias: 'd',
  description: 'Deploy your website and serverless functions',
  run: async (toolbox) => {
    const { parameters } = toolbox

    const { options } = parameters

    const {
      domain,
      functions = './functions',
      dir = './dist',
      prod = false,
    } = options
    const files = glob.sync(`${functions}/**/*.{js,ts}`)

    const explorerSync = cosmiconfigSync('serverlessui')
    const configResult = explorerSync.search()

    const apiFiles = files.join(',')
    const domainCli = domain ? `-c domainName=${domain}` : ''
    const prodCli = prod ? '-c prod=true' : ''
    const zoneIdCli = configResult.isEmpty
      ? ''
      : `-c zoneId=${configResult.config.zoneId}`
    const certificateArnCli = configResult.isEmpty
      ? ''
      : `-c zoneId=${configResult.config.certificateArn}`

    child_process.execSync(
      `cdk synth ${prodCli} ${domainCli} ${zoneIdCli} ${certificateArnCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${serverlessApplicationPath}" --quiet`,
      {
        stdio: 'inherit',
      }
    )

    child_process.execSync(
      `cdk deploy ${prodCli} ${domainCli} ${zoneIdCli} ${certificateArnCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${serverlessApplicationPath}" --require-approval never`,
      {
        stdio: 'inherit',
      }
    )
  },
}
