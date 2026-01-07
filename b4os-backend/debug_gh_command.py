#!/usr/bin/env python3
"""Debug script to test GitHub CLI command output."""

import subprocess

classroom_id = "284713"
command = f'gh classroom assignments -c {classroom_id}'

print(f"Running command: {command}")
print(f"Split command: {command.split()}")
print("=" * 80)

try:
    result = subprocess.run(
        command.split(),
        capture_output=True,
        text=True,
        timeout=30,
        check=True
    )

    output = result.stdout
    print(f"STDOUT ({len(output)} chars):")
    print(repr(output))
    print("=" * 80)
    print("Actual output:")
    print(output)
    print("=" * 80)

    lines = output.strip().split('\n')
    print(f"Number of lines: {len(lines)}")
    for i, line in enumerate(lines):
        print(f"Line {i}: {repr(line)}")
    print("=" * 80)

    # Test parsing logic
    if len(lines) < 4:
        print("ERROR: Invalid assignments list format (less than 4 lines)")
    else:
        print("SUCCESS: Valid format")

        assignments = []
        for line in lines[3:]:
            if line.strip():
                parts = line.split('\t')
                print(f"  Parts ({len(parts)}): {parts[:3] if len(parts) >= 3 else parts}")
                if len(parts) >= 7:
                    assignments.append((parts[0], parts[1], parts[6]))
                else:
                    print(f"  WARNING: Line has only {len(parts)} parts (expected >= 7)")

        print(f"\nParsed {len(assignments)} assignments:")
        for assignment_id, assignment_name, assignment_repo in assignments:
            print(f"  - {assignment_id}: {assignment_name}")
            print(f"    Repo: {assignment_repo}")

except subprocess.TimeoutExpired as e:
    print(f"ERROR: Command timed out")
except subprocess.CalledProcessError as e:
    print(f"ERROR: Command failed")
    print(f"STDERR: {e.stderr}")
except Exception as e:
    print(f"ERROR: Unexpected error: {e}")
    import traceback
    traceback.print_exc()
