import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { HostedZone } from "@aws-cdk/aws-route53";
import { App, Stack, StackProps } from "@aws-cdk/core";
import { ServerlessUI } from "@jakepartusch/notlify-construct";

interface ApplicationStackProps extends StackProps {
  buildId?: string;
  domainName?: string;
  zoneId?: string;
  certificateArn?: string;
  apiEntries: string[];
  uiEntry: string;
}

export class ApplicationStack extends Stack {
  constructor(scope: App, id: string, props: ApplicationStackProps) {
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
      domain,
    });
  }
}
