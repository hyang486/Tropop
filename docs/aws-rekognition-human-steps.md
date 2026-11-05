# AWS Rekognition: steps only the human can do

Purpose: connect the Rekognition CompareFaces check that the human approved on 2026-11-04 (see `docs/reviews/current.md`, "Human decision 2026-11-04"). The developer prepares the Edge Function and tests. These steps need the human's AWS account. None of them should cost money beyond the free plan and existing credit.

Never paste key values into chat, the repo, `app.json`, or any `EXPO_PUBLIC_` variable. Tell the developer only "secrets are set".

## 1. Pick the region

Use **us-east-2 (Ohio)**, the same region as the Supabase project. In the AWS console region menu, confirm that Amazon Rekognition opens there. If it does not, use us-east-1 and tell the developer which one.

## 2. Create a least-privilege IAM user (no console access)

1. IAM → Users → Create user. Name: `moment-rekognition-edge`. Leave "Provide user access to the AWS Management Console" unchecked.
2. Permissions: "Attach policies directly" → do not pick a managed policy. After creation, open the user → Add permissions → Create inline policy → JSON:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": "rekognition:CompareFaces", "Resource": "*" }
     ]
   }
   ```

   Name it `CompareFacesOnly`. CompareFaces does not support resource-level restriction, so `"Resource": "*"` is required. The single action is the limit.
3. User → Security credentials → Create access key → use case "Application running outside AWS". Keep the secret only until step 3 is done.

## 3. Store the keys as Supabase Edge Function secrets

Supabase dashboard → project `wuhkyjksiiqzoxvonfuy` → Edge Functions → Secrets → add:

| Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | the access key id from step 2 |
| `AWS_SECRET_ACCESS_KEY` | the secret access key from step 2 |
| `AWS_REGION` | `us-east-2` (or the region chosen in step 1) |

Then tell the developer "AWS secrets are set". The developer will verify that the names exist without reading the values.

## 4. Add a spending alert (recommended, free)

Billing → Budgets → Create budget → "Zero spend budget" (or a monthly cost budget of USD 5) with your email. This only sends alerts. It does not add a payment.

## 5. Provide rights-cleared test photos

For the connection check, three photos are needed. Use only photos the team has the right to use, for example team members who agree to it:

- A1 and A2: the same person, two different photos (match pair).
- B1: a different person (non-match pair against A1).

Put them on this Mac outside the repository, for example `~/Desktop/moment-face-test/`. Tell the developer the folder path and a one-line note on the source and rights. The photos are not committed, and the copies uploaded during the test are deleted afterwards.

## 6. Decision needed before real participant photos: AI-services opt-out

AWS may store and use images sent to Rekognition to improve the service unless an AI-services opt-out policy applies. That policy is set in **AWS Organizations**. Creating an Organization needs your separate approval (recorded rule: no Organizations without it).

- Until this is decided, only the test photos from step 5 are sent to AWS. Real participant photos stay blocked (supervisor P4).
- Options: (a) approve creating an Organization for this account (it is free) and attach an AI-services opt-out policy for Rekognition, or (b) keep real-photo matching blocked for now.

## What the developer does after steps 1–5

Deploy the CompareFaces Edge Function, which reads the three secrets and logs no keys or image bytes. Run one match pair and one non-match pair, then record the similarity scores and call count in `docs/implementation-status.md`. Delete the stored test images and verify that the delete worked.
