# Flag Types

## Release Flag

Used to decouple deployment from feature activation. The code is merged but the flag remains off until the team explicitly enables it.

- Purpose: control rollout timing without reverting code.
- Lifecycle: off at merge → staged rollout → fully on → cleanup.
- Example: `enable-new-checkout` is merged in v1.2 but kept off until marketing is ready.

## Experiment Flag

Used for A/B testing or feature experimentation. The flag defines treatment and control groups and must declare success metrics before rollout begins.

- Purpose: measure impact before committing to a full rollout.
- Lifecycle: draft with metrics → active experiment → winner selected → promoted to release flag or removed.
- Requirement: success metrics and sample size must be defined before activation.

## Kill Switch

An operational safety valve that can disable a feature instantly without a redeploy. Kill switches are independently reversible and must be wired into observability.

- Purpose: rapid rollback for production incidents.
- Lifecycle: always-on but gated → tripped during incident → reset after root cause is fixed.
- Requirement: must be reversible without deploy and must trigger an alert when tripped.

## Operational Flag

Used for non-functional controls such as maintenance mode, rate limiting overrides, or read-only mode.

- Purpose: control system behavior without changing code.
- Lifecycle: activated by operator → observed → deactivated when no longer needed.
- Requirement: must have a named owner and a maximum activation window.
