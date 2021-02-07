import { GluegunCommand } from 'gluegun'
import * as child_process from 'child_process'

export const command: GluegunCommand = {
  name: 'configure-domain',
  description: 'Create a Route53 Zone and Wildcard Certificate',
  run: async toolbox => {
    const { parameters, getDomainApplicationFileReference } = toolbox

    const { options } = parameters

    const { domain } = options

    const applicationFile = getDomainApplicationFileReference()

    child_process.execSync(
      `cdk synth -c domainName=${domain} -a "node ${applicationFile}" --quiet`,
      {
        stdio: 'inherit'
      }
    )

    child_process.execSync(
      `cdk deploy -c domainName=${domain} -a "node ${applicationFile}" --require-approval never`,
      {
        stdio: 'inherit'
      }
    )
  }
}
