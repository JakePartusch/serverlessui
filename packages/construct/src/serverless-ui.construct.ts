import { ICertificate } from "@aws-cdk/aws-certificatemanager";
import {
  ARecord,
  AaaaRecord,
  RecordTarget,
  IHostedZone,
} from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { IRestApi, LambdaRestApi } from "@aws-cdk/aws-apigateway";
import {
  CloudFrontWebDistribution,
  CloudFrontAllowedMethods,
  SourceConfiguration,
  OriginProtocolPolicy,
  IDistribution,
} from "@aws-cdk/aws-cloudfront";
import { IFunction } from "@aws-cdk/aws-lambda";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { BucketDeployment, ISource } from "@aws-cdk/aws-s3-deployment";
import { CfnOutput, Construct, RemovalPolicy } from "@aws-cdk/core";
import { Bucket, IBucket } from "@aws-cdk/aws-s3";
import * as path from "path";

interface Domain {
  /**
   * The custom domain name for this deployment
   */
  domainName: string;
  /**
   * The hosted zone associated with the custom domain
   */
  hostedZone: IHostedZone;
  /**
   * The wildcard certificate for this custom domain
   */
  certificate: ICertificate;
}

interface ServerlessUIProps {
  /**
   * The unique id to use in generating the infrastructure and domain. Only used with custom domains
   * Ex. https://{buildId}.my-domain.com
   */
  buildId?: string;
  /**
   * The custom domain to use for this deployment
   */
  domain?: Domain;
  /**
   * Paths to the entry files (JavaScript or TypeScript).
   */
  apiEntries: string[];
  /**
   * The sources from which to deploy the contents of the bucket.
   */
  uiSources: ISource[];
}

export class ServerlessUI extends Construct {
  /**
   * The s3 bucket the website is deployed to
   */
  readonly websiteBucket: IBucket;
  /**
   * The API Gateway APIs for the function deployments
   */
  readonly restApis: IRestApi[];
  /**
   * The Node.js Lambda Functions deployed
   */
  readonly functions: IFunction[];
  /**
   * The Cloudfront web distribution for the website and API Gateways
   */
  readonly distribution: IDistribution;

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
        //TODO: remove region reference?
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
      sources: props.uiSources,
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

    this.websiteBucket = websiteBucket;
    this.restApis = restApis;
    this.functions = lambdas;
    this.distribution = cloudFrontWebDistribution;
  }
}
