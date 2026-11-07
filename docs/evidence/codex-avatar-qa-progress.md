# Codex simulator avatar QA

Retest after shutting down and booting both existing simulators, completed 2026-11-06 around 00:10 America/Los_Angeles. Existing host test@example.com and guest Test joiner; existing QA verification room. Observations are direct Device Hub UI observations, not independent server verification.

## Passed
- Host selected synthetic QA-A using native photo picker; avatar rendered on Profile.
- Guest Info screen showed host QA-A after navigating out and back to refresh.
- Host replaced with QA-B; guest Info screen showed orange QA-B after refresh.
- Host started an activity; both simulator location permissions granted Allow Once. Only simulated locations used (host Cupertino; guest San Francisco). Both sharing switches enabled during test.
- Guest map rendered host orange QA-B photo marker and name Test; host appeared in Sharing now. Later stale state rendered a clock marker after no fresh host update.
- Guest sharing OFF, host sharing OFF, host End activity confirmed. Both map screens showed No activity running; guest switch OFF verified.
- Host removed photo; Profile returned to T initial/Add photo. Guest Info reopened and showed T for host. No account or room deleted.

## Needs follow-up / not passed
- Tapping the host marker by coordinates and by its accessible element did not visibly open a detail callout. Name Test was visible below the marker, but a speed detail was not observed. Do not mark marker callout/speed passed. Reproduce and inspect with developer.
- No independent server SELECT, outsider RLS rollback test, object cleanup or disk-cache deletion check performed by Codex. Supervisor/developer checks still needed.
- Member list was refreshed by leaving/reopening Info; this does not prove live avatar replacement without navigation.

## Automation recovery
Restart restored guest accessibility and coordinate input. Native software keyboard Go used when host hardware Return did not submit. Clipboard paste must not be used for simulator URL input; setValue followed by value inspection used. Host Expo Tools button overlapped Profile; Tools button was switched off to reach Profile.
