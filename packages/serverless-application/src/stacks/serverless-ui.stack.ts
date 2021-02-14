import { App, Stack, StackProps } from "@aws-cdk/core";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { HostedZone } from "@aws-cdk/aws-route53";
import { Source } from "@aws-cdk/aws-s3-deployment";
import { ServerlessUI } from "@serverlessui/construct";

interface ServerlessUIStackProps extends StackProps {
  buildId?: string;
  domainName?: string;
  zoneId?: string;
  certificateArn?: string;
  apiEntries: string[];
  uiEntry: string;
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

    new ServerlessUI(this, "ServerlessUI", {
      ...props,
      uiSources: [Source.asset(props.uiEntry)],
      domain,
    });
  }
}
