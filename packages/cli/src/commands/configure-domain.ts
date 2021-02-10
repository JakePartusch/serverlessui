import { GluegunCommand } from 'gluegun'
import * as child_process from 'child_process'
const domainApplicationPath = require.resolve('@serverlessui/domain-app')

export const command: GluegunCommand = {
  name: 'configure-domain',
  description: 'Create a Route53 Zone and Wildcard Certificate',
  run: async toolbox => {
    const { parameters } = toolbox
    const { options } = parameters
    const { domain } = options

    child_process.execSync(
      `cdk synth -c domainName=${domain} -a "node ${domainApplicationPath}" --quiet`,
      {
        stdio: 'inherit'
      }
    )

    child_process.execSync(
      `cdk deploy -c domainName=${domain} -a "node ${domainApplicationPath}" --require-approval never`,
      {
        stdio: 'inherit'
      }
    )
  }
}
