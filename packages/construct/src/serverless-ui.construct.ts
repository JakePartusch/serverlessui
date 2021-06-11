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
  IDistribution,
  Distribution,
  ViewerProtocolPolicy,
  BehaviorOptions,
  AllowedMethods,
  CachePolicy,
  Function,
  FunctionCode,
  FunctionEventType
} from "@aws-cdk/aws-cloudfront";
import { IFunction, Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { BucketDeployment, ISource } from "@aws-cdk/aws-s3-deployment";
import { CfnOutput, Construct, RemovalPolicy, Stack } from "@aws-cdk/core";
import { Bucket, IBucket } from "@aws-cdk/aws-s3";
import { PolicyStatement, Effect, AnyPrincipal } from "@aws-cdk/aws-iam";
import * as path from "path";
import { HttpOrigin, S3Origin } from "@aws-cdk/aws-cloudfront-origins";

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
  /**
   * Key-value pairs that Lambda caches and makes available for your Lambda functions.
   *
   * Use environment variables to apply configuration changes, such
   * as test and production environment configurations, without changing your
   * Lambda function source code.
   *
   * @default - No environment variables.
   */
  readonly apiEnvironment?: {
    [key: string]: string;
  };
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
    });

    // Apply bucket policy to enforce encryption of data in transit
    websiteBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "HttpsOnly",
        resources: [`${websiteBucket.bucketArn}/*`],
        actions: ["*"],
        principals: [new AnyPrincipal()],
        effect: Effect.DENY,
        conditions: {
          Bool: {
            "aws:SecureTransport": "false",
          },
        },
      })
    );

    const functionFiles = props.apiEntries.map((apiEntry) => ({
      name: path.basename(apiEntry).split(".")[0],
      entry: apiEntry,
    }));

    const lambdas = functionFiles.map((functionFile) => {
      return new NodejsFunction(this, `NodejsFunction-${functionFile.name}`, {
        entry: functionFile.entry,
        handler: "handler",
        runtime: Runtime.NODEJS_14_X,
        bundling: {
          externalModules: [
            "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
          ],
        },
        environment: {
          ...props.apiEnvironment,
        },
      });
    });

    

    const restApis = lambdas.map((lambda, i) => {
      return new LambdaRestApi(this, `LambdaRestApi-${functionFiles[i].name}`, {
        handler: lambda,
      });
    });

    /**
     * Build a Cloudfront behavior for each api function that allows all HTTP Methods and has caching disabled.
     */
    const additionalBehaviors: Record<
      string,
      BehaviorOptions
    > = restApis.reduce((previous, current, i) => {
      const functionName = functionFiles[i].name;
      const restApiOrigin = `${current.restApiId}.execute-api.${
        Stack.of(this).region
      }.amazonaws.com`;
      const newAdditionalBehaviors = { ...previous };
      newAdditionalBehaviors[`/api/${functionName}`] = {
        origin: new HttpOrigin(restApiOrigin, { originPath: "/prod" }),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      };
      return newAdditionalBehaviors;
    }, {} as Record<string, BehaviorOptions>);
    /**
     * URL rewrite to append index.html to the URI for single page applications
     */
    const cfFunction = new Function(this, 'CloudFrontFunction', {
      code: FunctionCode.fromInline(`
      function handler(event) {
        var request = event.request;
        var uri = request.uri;
        
        // Check whether the URI is missing a file name.
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        } 
        // Check whether the URI is missing a file extension.
        else if (!uri.includes('.')) {
            request.uri += '/index.html';
        }
    
        return request;
      }`),
    });
    /**
     * Creating a Cloudfront distribution for the website bucket with an aggressive caching policy
     */
    const distribution = new Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new S3Origin(websiteBucket),
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [{
          function: cfFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        }],
      },
      defaultRootObject: "index.html",
      additionalBehaviors,
      certificate: props.domain?.certificate,
      domainNames: props.domain
        ? [
            props.buildId
              ? `${props.buildId}.${props.domain.domainName}`
              : `www.${props.domain.domainName}`,
          ]
        : undefined,
      enableLogging: true,
    });

    new BucketDeployment(this, "BucketDeployment", {
      sources: props.uiSources,
      destinationBucket: websiteBucket!,
      distribution: distribution,
      retainOnDelete: false,
    });

    if (props.domain) {
      new ARecord(this, "IPv4 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      });

      new AaaaRecord(this, "IPv6 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      });
    }
    if (!props.domain) {
      new CfnOutput(this, "Base Url", {
        value: `https://${distribution.distributionDomainName}`,
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
          value: `https://${distribution.distributionDomainName}/api/${apiEntry.name}`,
        });
      }
    });

    this.websiteBucket = websiteBucket;
    this.restApis = restApis;
    this.functions = lambdas;
    this.distribution = distribution;
  }
}
