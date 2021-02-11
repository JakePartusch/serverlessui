import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface ProxyResponse {
  data: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(JSON.stringify(event, null, 2));
  const response: ProxyResponse = {
    data: "hello world",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
