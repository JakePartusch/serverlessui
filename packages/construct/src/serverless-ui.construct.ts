import { ICertificate } from "@aws-cdk/aws-certificatemanager";
import {
  ARecord,
  AaaaRecord,
  RecordTarget,
  IHostedZone,
} from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import {
  CloudFrontWebDistribution,
  CloudFrontAllowedMethods,
  SourceConfiguration,
  OriginProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { CfnOutput, Construct, RemovalPolicy } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import * as path from "path";

interface Domain {
  domainName: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
}

interface ServerlessUIProps {
  buildId?: string;
  domain?: Domain;
  apiEntries: string[];
  uiEntry: string;
}

export class ServerlessUI extends Construct {
  constructor(scope: Construct, id: string, props: ServerlessUIProps) {
    super(scope, id);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    const functionFiles = props.apiEntries.map((apiEntry) => ({
      name: path.basename(apiEntry).split(".")[0],
      entry: apiEntry,
    }));

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
            customOriginSource: {
              domainName: websiteBucket.bucketWebsiteDomainName,
              originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
          ...originConfigs,
        ],
        aliasConfiguration: props.domain
          ? {
              acmCertRef: props.domain.certificate.certificateArn,
              names: [
                props.buildId
                  ? `${props.buildId}.${props.domain.domainName}`
                  : `www.${props.domain.domainName}`,
              ],
            }
          : undefined,
      }
    );

    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset(props.uiEntry)],
      destinationBucket: websiteBucket!,
      distribution: cloudFrontWebDistribution,
      retainOnDelete: false,
    });

    if (props.domain) {
      new ARecord(this, "IPv4 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(cloudFrontWebDistribution)
        ),
      });

      new AaaaRecord(this, "IPv6 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(cloudFrontWebDistribution)
        ),
      });
    }
    if (!props.domain) {
      new CfnOutput(this, "Base Url", {
        value: `https://${cloudFrontWebDistribution.distributionDomainName}`,
      });
    } else {
      new CfnOutput(this, "Base Url", {
        value: props.buildId
          ? `https://${props.buildId}.${props.domain.domainName}`
          : `https://www.${props.domain.domainName}`,
      });
    }

    functionFiles.map((apiEntry) => {
      if (props.domain) {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: props.buildId
            ? `https://${props.buildId}.${props.domain.domainName}/api/${apiEntry.name}`
            : `https://www.${props.domain.domainName}/api`,
        });
      } else {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: `https://${cloudFrontWebDistribution.distributionDomainName}/api/${apiEntry.name}`,
        });
      }
    });
  }
}
