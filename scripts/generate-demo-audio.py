#!/usr/bin/env python3
"""Regenerate the demo recordings in supabase/demo-audio (macOS only).

Reads the seeded transcripts from the linked Supabase project, speaks each
one with a per-worker macOS voice, and writes 64 kbps mono AAC files named
<employee-slug>-<local date>.m4a, the names private.attach_demo_audio expects.

Upload afterwards with:
  npx supabase storage cp -r supabase/demo-audio ss:///recordings/demo \
    --content-type audio/mp4 --linked --experimental
"""

import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "supabase" / "demo-audio"

VOICES = {
    "Isaac Wang": "Eddy (English (US))",
    "Maya Patel": "Samantha (English (US))",
    "Liam Johnson": "Reed (English (US))",
    "Sophia Lee": "Flo (English (US))",
    "Noah Garcia": "Rocko (English (US))",
    "Ava Martinez": "Shelley (English (US))",
    "Ethan Brooks": "Ralph",
    "Olivia Chen": "Sandy (English (US))",
    "Lucas Rivera": "Daniel (English (UK))",
    "Emma Nguyen": "Karen",
    "Mason Clark": "Grandpa (English (US))",
    "Harper Diaz": "Moira",
}

# Any demo farm has the same seeded transcripts; take them from the oldest.
QUERY = """
select e.full_name,
       to_char(l.started_at at time zone o.timezone, 'YYYY-MM-DD') as day,
       l.transcript
from activity_logs l
join employees e on e.id = l.employee_id
join organizations o on o.id = l.organization_id
where o.id = (select id from organizations where demo_as_of is not null
              order by created_at limit 1)
  and l.transcript is not null
"""


def spoken(transcript: str) -> str:
    text = re.sub(
        r"^(Offline guided voice log created at \S+\. |Guided voice log\. )",
        "",
        transcript,
    )
    # Drop the prompt labels and pause briefly before each answer.
    text = re.sub(r"Question \(\w+\): ", "", text)
    return text.replace("Answer: ", "[[slnc 350]] ")


def main() -> None:
    result = subprocess.run(
        ["npx", "supabase", "db", "query", "--linked", "-o", "json", QUERY],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(result.stdout)
    rows = data["rows"] if isinstance(data, dict) else data
    OUT.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        for row in rows:
            slug = f"{row['full_name'].lower().replace(' ', '-')}-{row['day']}"
            aiff = Path(tmp) / f"{slug}.aiff"
            m4a = OUT / f"{slug}.m4a"
            subprocess.run(
                ["say", "-v", VOICES[row["full_name"]], "-r", "175",
                 "-o", aiff, spoken(row["transcript"])],
                check=True,
            )
            subprocess.run(
                ["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000",
                 "-c", "1", aiff, m4a],
                check=True,
            )
            print(f"wrote {m4a.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
