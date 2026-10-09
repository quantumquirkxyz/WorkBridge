#!/usr/bin/env python3
"""Generate a graphic design project plan skeleton."""

import json
import sys
from datetime import datetime, timedelta


def generate_plan(project_name, deliverables):
    """Generate a project plan skeleton."""
    start_date = datetime.now()
    phases = [
        ("Discovery", 7),
        ("Concept", 10),
        ("Refinement", 14),
        ("Production", 7),
        ("Delivery", 3)
    ]
    plan = {
        "project": project_name,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "phases": [],
        "deliverables": deliverables,
        "stakeholders": {
            "project_owner": "to-be-defined",
            "creative_director": "to-be-defined",
            "designer": "to-be-defined",
            "reviewers": [],
            "approvers": []
        }
    }
    current_date = start_date
    for name, duration in phases:
        end_date = current_date + timedelta(days=duration)
        plan["phases"].append({
            "name": name,
            "start": current_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
            "duration_days": duration
        })
        current_date = end_date
    return plan


def main():
    if len(sys.argv) < 2:
        print("Usage: generate-project-plan.py <project_name> [deliverable1 deliveriverable2 ...]")
        print("Example: generate-project-plan.py acme-rebrand poster social-graphics packaging")
        sys.exit(1)
    project_name = sys.argv[1]
    deliverables = sys.argv[2:] if len(sys.argv) > 2 else ["to-be-defined"]
    plan = generate_plan(project_name, deliverables)
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
