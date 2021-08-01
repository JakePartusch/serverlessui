Remove all buckets for Preview builds

```
aws s3api list-buckets \
   --query 'Buckets[?starts_with(Name, `serverlessuiapppreview`) == `true`].[Name]' \
   --output text | xargs -I {} aws s3 rb s3://{} --force
```
