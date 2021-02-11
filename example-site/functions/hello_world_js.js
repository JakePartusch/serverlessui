export const handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const response = {
    data: "hello world",
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
