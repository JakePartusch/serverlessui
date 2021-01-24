import {
  Certificate,
  CertificateValidation,
} from "@aws-cdk/aws-certificatemanager";
import {
  ARecord,
  AaaaRecord,
  HostedZone,
  RecordTarget,
} from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import {
  CloudFrontWebDistribution,
  CloudFrontAllowedMethods,
  SourceConfiguration,
} from "@aws-cdk/aws-cloudfront";
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import {
  App,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
} from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import * as path from "path";

interface ApplicationStackProps extends StackProps {
  buildId?: string;
  domainName?: string;
  zoneId?: string;
  apiEntries: string[];
  uiEntry: string;
}

export class ApplicationStack extends Stack {
  constructor(scope: App, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    let hostedZone, certificate;
    if (props.domainName && props.zoneId) {
      hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
        hostedZoneId: props.zoneId,
        zoneName: props.domainName,
      });

      certificate = new Certificate(this, "Certificate", {
        domainName: `*.${props.domainName}`,
        validation: CertificateValidation.fromDns(hostedZone),
      });
    }

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      "OriginAccessIdentity",
      {
        comment: `CloudFront OriginAccessIdentity for ${websiteBucket.bucketName}`,
      }
    );

    const functionFiles = props.apiEntries.map((apiEntry) => ({
      name: path.basename(apiEntry).split(".")[0],
      entry: apiEntry,
    }));

    websiteBucket.grantRead(originAccessIdentity.grantPrincipal);

    const lambdas = functionFiles.map((functionFile) => {
      return new NodejsFunction(this, `NodejsFunction-${functionFile.name}`, {
        entry: functionFile.entry,
        handler: "handler",
      });
    });

    const restApis = lambdas.map((lambda, i) => {
      return new LambdaRestApi(this, `LambdaRestApi-${functionFiles[i].name}`, {
        handler: lambda,
      });
    });

    const originConfigs: SourceConfiguration[] = restApis.map((restApi, i) => ({
      customOriginSource: {
        domainName: `${restApi.restApiId}.execute-api.us-east-1.amazonaws.com`,
        originPath: "/prod",
      },
      behaviors: [
        {
          pathPattern: `/api/${functionFiles[i].name}`,
          allowedMethods: CloudFrontAllowedMethods.ALL,
        },
      ],
    }));

    const cloudFrontWebDistribution = new CloudFrontWebDistribution(
      this,
      "CloudfrontWebDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              originAccessIdentity,
              s3BucketSource: websiteBucket,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
          ...originConfigs,
        ],
        aliasConfiguration:
          props.domainName && certificate
            ? {
                acmCertRef: certificate.certificateArn,
                names: [
                  props.buildId
                    ? `${props.buildId}.${props.domainName}`
                    : props.domainName,
                ],
              }
            : undefined,
      }
    );

    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset(props.uiEntry)],
      destinationBucket: websiteBucket!,
    });

    if (hostedZone) {
      new ARecord(this, "IPv4 AliasRecord", {
        zone: hostedZone,
        recordName: props.buildId ?? "@",
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(cloudFrontWebDistribution)
        ),
      });

      new AaaaRecord(this, "IPv6 AliasRecord", {
        zone: hostedZone,
        recordName: props.buildId ?? "@",
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(cloudFrontWebDistribution)
        ),
      });
    }
    if (!props.domainName) {
      new CfnOutput(this, "Base Url", {
        value: cloudFrontWebDistribution.distributionDomainName,
      });
    } else {
      new CfnOutput(this, "Base Url", {
        value: props.buildId
          ? `https://${props.buildId}.${props.domainName}`
          : `https://${props.domainName}`,
      });
    }

    functionFiles.map((apiEntry) => {
      if (props.domainName) {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: props.buildId
            ? `https://${props.buildId}.${props.domainName}/api/${apiEntry.name}`
            : `https://${props.domainName}/api`,
        });
      } else {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: `${cloudFrontWebDistribution.distributionDomainName}/api/${apiEntry.name}`,
        });
      }
    });
  }
}
