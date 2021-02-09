import { App, Stack, StackProps } from "@aws-cdk/core";
import { DomainCertificate } from "@serverlessui/construct";

interface DomainStackProps extends StackProps {
  domainName: string;
}

export class DomainStack extends Stack {
  constructor(scope: App, id: string, props: DomainStackProps) {
    super(scope, id, props);

    new DomainCertificate(this, "DomainCertificate", {
      domainName: props.domainName,
    });
  }
}
