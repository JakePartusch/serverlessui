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
  domainName: string;
  apiEntries: string[];
  uiEntry: string;
}

export class ApplicationStack extends Stack {
  constructor(scope: App, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: "Z03627292WZKGOOSA618D",
      zoneName: props.domainName,
    });

    const certificate = new Certificate(this, "Certificate", {
      domainName: `*.${props.domainName}`,
      validation: CertificateValidation.fromDns(hostedZone),
    });

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

    websiteBucket.grantRead(originAccessIdentity.grantPrincipal);

    const lambdas = props.apiEntries.map((apiEntry) => {
      return new NodejsFunction(
        this,
        `NodejsFunction-${path.basename(apiEntry, ".ts")}`,
        {
          entry: apiEntry,
          handler: "handler",
        }
      );
    });

    const restApis = lambdas.map((lambda, i) => {
      return new LambdaRestApi(
        this,
        `LambdaRestApi-${path.basename(props.apiEntries[i], ".ts")}`,
        {
          handler: lambda,
        }
      );
    });

    const originConfigs: SourceConfiguration[] = restApis.map((restApi, i) => ({
      customOriginSource: {
        domainName: `${restApi.restApiId}.execute-api.us-east-1.amazonaws.com`,
        originPath: "/prod",
      },
      behaviors: [
        {
          pathPattern: `/api/${path.basename(props.apiEntries[i], ".ts")}`,
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
        aliasConfiguration: {
          acmCertRef: certificate.certificateArn,
          names: [
            props.buildId
              ? `${props.buildId}.${props.domainName}`
              : props.domainName,
          ],
        },
      }
    );

    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset(props.uiEntry)],
      destinationBucket: websiteBucket!,
    });

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

    new CfnOutput(this, "Base Url", {
      value: props.buildId
        ? `https://${props.buildId}.${props.domainName}`
        : `https://${props.domainName}`,
    });

    props.apiEntries.map(
      (apiEntry) =>
        new CfnOutput(
          this,
          `Function Path - ${path.basename(apiEntry, ".ts")}`,
          {
            value: props.buildId
              ? `https://${props.buildId}.${
                  props.domainName
                }/api/${path.basename(apiEntry, ".ts")}`
              : `https://${props.domainName}/api`,
          }
        )
    );
  }
}
