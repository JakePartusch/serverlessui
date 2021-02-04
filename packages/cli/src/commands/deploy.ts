import { GluegunCommand } from 'gluegun'
import * as glob from 'glob'

const command: GluegunCommand = {
  name: 'deploy',
  run: async (toolbox) => {
    const { print, parameters, system, getApplicationFileReference } = toolbox

    const { options } = parameters

    const {
      domain,
      functions = './functions',
      dir = './dist',
      prod = false,
    } = options
    const files = glob.sync(`${functions}/**/*.{js,ts}`)

    const apiFiles = files.join(',')
    // Load this from another package?
    print.info(getApplicationFileReference())
    const applicationFile = getApplicationFileReference()
    // const applicationFile = `${__dirname}/application.ts`
    const domainCli = domain ? `-c domainName=${domain}` : ''
    const prodCli = prod ? '-c prod=true' : ''

    const synth = await system.run(
      `cdk synth ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --quiet`
    )
    print.info(synth)

    // child_process.execSync(
    //   `cdk synth ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --quiet`,
    //   {
    //     stdio: 'inherit'
    //   }
    // )

    // child_process.execSync(
    //   `cdk deploy ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --require-approval never`,
    //   {
    //     stdio: 'inherit'
    //   }
    // )

    print.info(domain)
  },
}

module.exports = command
