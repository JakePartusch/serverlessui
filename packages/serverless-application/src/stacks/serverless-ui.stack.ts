import { App, CfnOutput, Stack, StackProps } from "@aws-cdk/core";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { HostedZone } from "@aws-cdk/aws-route53";
import { Source } from "@aws-cdk/aws-s3-deployment";
import { ServerlessUI } from "@serverlessui/construct";
import { NextJSLambdaEdge, Props } from "@sls-next/cdk-construct";

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
      const nextJSLambdaEdgeProps: Props = {
        serverlessBuildOutDir: "./build",
        name: {
          apiLambda: `ServerlessUINext-Api-${props.buildId}`,
          defaultLambda: `ServerlessUINext-Default-${props.buildId}`,
          imageLambda: `ServerlessUINext-Image-${props.buildId}`,
        },
      };
      if (domain && domain.hostedZone && domain.certificate) {
        nextJSLambdaEdgeProps.domain = {
          ...domain,
          domainName: `${props.buildId}.${props.domainName}`,
        };
      }
      const { distribution, aRecord } = new NextJSLambdaEdge(
        this,
        "ServerlessUINext",
        nextJSLambdaEdgeProps
      );

      if (aRecord) {
        new CfnOutput(this, "Base Url", {
          value: aRecord.domainName,
        });
      } else {
        new CfnOutput(this, "Base Url", {
          value: `https://${distribution.distributionDomainName}`,
        });
      }
    } else {
      new ServerlessUI(this, "ServerlessUI", {
        ...props,
        uiSources: [Source.asset(props.uiEntry)],
        domain,
      });
    }
  }
}
