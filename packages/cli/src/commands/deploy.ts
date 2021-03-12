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
  run: async toolbox => {
    const { parameters } = toolbox

    const { options } = parameters

    const { functions = './functions', dir = './dist', prod = false } = options

    const files = glob.sync(`${functions}/**/*.{js,ts}`)

    const explorerSync = cosmiconfigSync('serverlessui')
    const configResult = explorerSync.search()

    const apiFiles = files.join(',')
    const prodCli = prod ? '-c prod=true' : ''

    if (apiFiles.length === 0) {
      toolbox.print.info(`No functions found in directory ${functions}`)
    }
    if (prod) {
      toolbox.print.highlight('Deploying Production Stack...')
    } else {
      toolbox.print.info('Deploying Preview Stack...')
    }
    if (!configResult?.isEmpty) {
      toolbox.print.info('Config file found, overriding defaults')
    }

    let domainConfigCli = ''
    if (
      configResult?.config?.zoneId &&
      configResult?.config?.certificateArn &&
      configResult?.config?.domain
    ) {
      toolbox.print.info(
        'Using Zone ID, Certificate Arn, and Domain from config file'
      )
      domainConfigCli = `-c zoneId="${configResult?.config?.zoneId}" -c certificateArn="${configResult?.config?.certificateArn}" -c domainName="${configResult?.config?.domain}"`
    } else {
      toolbox.print.warning(
        'Zone ID, Certificate Arn and Domain not specified, defaulting to cloudfront.net'
      )
    }

    toolbox.print.highlight(
      `npx cdk synth ${prodCli} ${domainConfigCli} -c apiEntries="${apiFiles}" -c uiEntry="${dir}" -a "node ${serverlessApplicationPath}" --quiet`
    )
    child_process.execSync(
      `npx cdk synth ${prodCli} ${domainConfigCli} -c apiEntries="${apiFiles}" -c uiEntry="${dir}" -a "node ${serverlessApplicationPath}" --quiet`,
      {
        stdio: 'inherit'
      }
    )

    toolbox.print.highlight(
      `npx cdk deploy ${prodCli} ${domainConfigCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${serverlessApplicationPath}" --require-approval never --outputs-file cdk.out/outputs.json`
    )

    child_process.execSync(
      `npx cdk deploy ${prodCli} ${domainConfigCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${serverlessApplicationPath}" --require-approval never --outputs-file cdk.out/outputs.json`,
      {
        stdio: 'inherit'
      }
    )
  }
}
