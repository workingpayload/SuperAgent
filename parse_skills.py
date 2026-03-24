import os
import glob
import re

skills = []
for file in glob.glob("**/*.md", recursive=True):
    if file.lower().endswith("skill.md"):
        with open(file, "r") as f:
            content = f.read()

            # Use folder name for title
            folder_name = os.path.basename(os.path.dirname(file))
            name = folder_name

            # Extract description
            desc = ""
            desc_match = re.search(r"^description:\s*(.+)$", content, re.MULTILINE)
            if desc_match:
                desc = desc_match.group(1).strip()

            if not desc:
                # look for text after ## Description
                desc_match = re.search(r"## Description\n+(.*?)(?=\n##|$)", content, re.DOTALL)
                if desc_match:
                    desc = desc_match.group(1).strip().replace('\n', ' ')

            if not desc:
                desc = "No description available."

            skills.append({"name": name, "desc": desc, "path": file})

skills.sort(key=lambda x: x['name'].lower())

with open("README.md", "w") as f:
    f.write("# Agent Skills Repository\n\n")
    f.write("This repository contains a collection of agent skills designed to make AI agents smarter and more capable across a wide variety of tasks.\n\n")
    f.write("## Available Skills\n\n")

    for skill in skills:
        f.write(f"### {skill['name']}\n\n")
        f.write(f"**Path:** `{skill['path']}`\n\n")
        f.write(f"{skill['desc']}\n\n")

print(f"Generated README.md with {len(skills)} skills.")
