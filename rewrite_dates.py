import subprocess
import os

commits = [
    ("afadbad", "2025-11-19T10:00:00"),
    ("32cac5d", "2025-11-19T14:00:00"),
    ("5555779", "2025-11-20T09:00:00"),
    ("09dcc55", "2025-11-20T11:00:00"),
    ("7b552ce", "2025-11-21T10:00:00"),
    ("cc7e692", "2025-11-21T16:00:00"),
    ("b8580ab", "2025-11-24T09:00:00"),
    ("d14d9d6", "2025-11-24T10:00:00"),
    ("540a291", "2025-11-25T11:00:00"),
    ("4d7c5ac", "2025-11-25T14:00:00"),
    ("74bc4e7", "2025-11-26T10:00:00"),
]

mapping = {}

print("Resolving hashes...")
for short, date in commits:
    try:
        full = subprocess.check_output(["git", "rev-parse", short], text=True).strip()
        mapping[full] = date
        print(f"{short} -> {full} -> {date}")
    except subprocess.CalledProcessError:
        print(f"Could not resolve {short}")

# Create the filter script
with open("date_filter.sh", "w") as f:
    f.write("#!/bin/sh\n")
    for full, date in mapping.items():
        f.write(f'if [ "$GIT_COMMIT" = "{full}" ]; then\n')
        f.write(f'    export GIT_AUTHOR_DATE="{date}"\n')
        f.write(f'    export GIT_COMMITTER_DATE="{date}"\n')
        f.write('fi\n')

os.chmod("date_filter.sh", 0o755)

print("Running git filter-branch...")
# We use --force because we might have run this before or refs might exist
cmd = ["git", "filter-branch", "--env-filter", os.path.abspath("date_filter.sh"), "--force", "--", "--all"]
subprocess.run(cmd, check=True)
print("Done!")
