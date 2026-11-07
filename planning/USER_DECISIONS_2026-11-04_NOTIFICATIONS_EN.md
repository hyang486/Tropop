# Human decisions: notifications and setup

Recorded November 4, 2026 (America/Los_Angeles). These decisions come directly from the human in the Codex conversation and override earlier requirements only where stated.

## Confirmed

- The human reports that Supabase Allow anonymous sign-ins is now enabled. Verify the actual auth setting and guest sign-in behavior, then remove the stale missing-toggle blocker if confirmed. In the subsequent screenshot (03:23 local time), the human reported completion and showed Confirm email switched off. Verify the saved remote state; this is now the development setting selected by the human.
- The human will not join the paid Apple Developer Program for this milestone. Show the notification experience as a demonstration. Do not require paid Apple membership, APNs signing credentials, TestFlight, or real iOS remote push delivery to complete this milestone.
- Preserve real room events, realtime in-app alerts, arrival/status/Emergency, sound/haptics where available, the 24-hour expiry reminder logic, and actual server expiry/deletion. Use in-app/demo notification presentation and local notifications where supported and verified. Clearly distinguish any demonstration of remote delivery from real APNs delivery; do not claim a locked/background iPhone can receive another member's emergency in real time without remote push. This does not turn chat or server data operations into mock data.
- EAS/Expo CLI login is separate from the earlier MCP OAuth connection. If real iOS push is omitted, EAS login for push tokens must not block local iOS development.

## Face matching: AWS provider selected; credentials being prepared

The human subsequently accepted the AWS direction by saying they would obtain the AWS API credentials and asking for step-by-step instructions. Use AWS Rekognition CompareFaces for real photo-only matching. Credentials are not yet supplied. Do not treat this as authorization to create a paid AWS plan/organization or a broad spending allowance on the human's behalf. Prepare the integration and tests; do not request secret values in chat or store them in the mobile bundle.

AWS Group 1 pricing example is USD 0.001 per processed image for the first million in the referenced US region. AWS FAQ counts one CompareFaces call as one processed source image even though both a source and target are supplied. Approximate comparisons = enrolled users x room photos, before retries and additional API calls. Free credit eligibility varies; estimates should not assume free usage.

## Correction to earlier provider-retention assumption

The implementation plan/review currently equates stateless CompareFaces/no collection with no provider-retained data. That claim is too broad. The API's returned results do not persist as a collection, but AWS documentation says submitted images may be retained/used for service improvement unless opted out. Review the effective AWS AI-services opt-out policy and provider retention before sending real participant images or claiming provider-side deletion. Preserve the existing room-scoped cleanup/late-result requirements. Do not mark this privacy requirement passed from API statelessness alone.

Primary sources checked November 4, 2026:
- https://docs.expo.dev/push-notifications/push-notifications-setup/ (paid Apple account for iOS remote-push credentials)
- https://docs.expo.dev/versions/v58.0.0/sdk/notifications/ (local notification support; enableRemoteNotifications false avoids adding APNs entitlement)
- https://aws.amazon.com/rekognition/pricing/
- https://aws.amazon.com/rekognition/faqs/ (CompareFaces billing unit and image retention)
- https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CompareFaces.html
- https://docs.aws.amazon.com/rekognition/latest/dg/security-data-encryption.html
- https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html
