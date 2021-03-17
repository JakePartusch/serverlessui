import { App, Stack, StackProps } from "@aws-cdk/core";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { HostedZone } from "@aws-cdk/aws-route53";
import { Source } from "@aws-cdk/aws-s3-deployment";
import { ServerlessUI } from "@serverlessui/construct";
import { NextJSLambdaEdge } from "@sls-next/cdk-construct";

interface ServerlessUIStackProps extends StackProps {
  buildId?: string;
  domainName?: string;
  zoneId?: string;
  certificateArn?: string;
  apiEntries: string[];
  uiEntry: string;
  isNextApp: boolean;
}

export class ServerlessUIStack extends Stack {
  constructor(scope: App, id: string, props: ServerlessUIStackProps) {
    super(scope, id, props);

    const domain =
      props.domainName && props.zoneId && props.certificateArn
        ? {
            domainName: props.domainName,
            hostedZone: HostedZone.fromHostedZoneAttributes(
              this,
              "HostedZone",
              {
                hostedZoneId: props.zoneId,
                zoneName: props.domainName,
              }
            ),
            certificate: Certificate.fromCertificateArn(
              this,
              "Certificate",
              props.certificateArn
            ),
          }
        : undefined;
    if (props.isNextApp) {
      //@ts-ignore
      new NextJSLambdaEdge(this, "ServerlessUINext", {
        serverlessBuildOutDir: "./build",
        domain: {
          ...domain,
          domainName: `${props.buildId}.${props.domainName}`,
        },
        name: {
          apiLambda: `ServerlessUINext-Api-${props.buildId}`,
          defaultLambda: `ServerlessUINext-Default-${props.buildId}`,
          imageLambda: `ServerlessUINext-Image-${props.buildId}`,
        },
      });
    } else {
      new ServerlessUI(this, "ServerlessUI", {
        ...props,
        uiSources: [Source.asset(props.uiEntry)],
        domain,
      });
    }
  }
}
