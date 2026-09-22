#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Resolve paths ──────────────────────────────────────────────────
const PKG_ROOT = path.resolve(__dirname, "..");
const SCRIPTS_DIR = path.join(PKG_ROOT, "scripts");
const HOME = os.homedir();

const TARGETS = {
  agents: {
    label: "Agent Skills compatible CLIs",
    installDir: path.join(HOME, ".agents", "skills"),
  },
  claude: {
    label: "Claude Code",
    installDir: path.join(HOME, ".claude", "skills"),
  },
  copilot: {
    label: "GitHub Copilot CLI",
    installDir: path.join(HOME, ".copilot", "skills"),
  },
  codex: {
    label: "OpenAI Codex CLI",
    installDir: path.join(HOME, ".codex", "skills"),
  },
  gemini: {
    label: "Gemini CLI",
    installDir: path.join(HOME, ".gemini", "skills"),
  },
  antigravity: {
    label: "Google Antigravity",
    installDir: path.join(HOME, ".gemini", "antigravity", "skills"),
  },
};
const TARGET_NAMES = Object.keys(TARGETS);

// ── Helpers ────────────────────────────────────────────────────────
function hasPython() {
  for (const cmd of ["python3", "python"]) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore" });
      return cmd;
    } catch (_) {}
  }
  return null;
}

function runPythonScript(scriptName, args = []) {
  const py = hasPython();
  if (!py) {
    console.error("Error: Python 3 is required but not found in PATH.");
    console.error("Install Python 3: https://python.org/downloads/");
    process.exit(1);
  }
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    process.exit(1);
  }
  const result = spawnSync(py, [scriptPath, ...args], {
    stdio: "inherit",
    cwd: PKG_ROOT,
  });
  process.exit(result.status || 0);
}

function findSkillFiles() {
  const skills = [];
  const entries = fs.readdirSync(PKG_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "bin" || entry.name === "scripts") continue;
    const dir = path.join(PKG_ROOT, entry.name);
    for (const fname of ["skill.md", "SKILL.md"]) {
      const fpath = path.join(dir, fname);
      if (fs.existsSync(fpath)) {
        skills.push({ name: entry.name, file: fname, fullPath: fpath, dir: entry.name });
        break;
      }
    }
  }
  return skills;
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function resolveTargets(value, defaultToAll = true) {
  const requested = value
    ? value.split(",").map(target => target.trim().toLowerCase()).filter(Boolean)
    : (defaultToAll ? ["all"] : ["claude"]);
  const targets = requested.includes("all") ? TARGET_NAMES : [...new Set(requested)];
  const unknown = targets.filter(target => !TARGETS[target]);
  if (unknown.length > 0) {
    console.error(`Unknown target(s): ${unknown.join(", ")}.`);
    console.error(`Use "all" or a comma-separated list of: ${TARGET_NAMES.join(", ")}.`);
    process.exit(2);
  }
  return targets;
}

function skillPath(installDir, slug) {
  return path.join(installDir, slug, "SKILL.md");
}

function installToTarget(target, skills, options) {
  const { installDir, label } = TARGETS[target];
  const { dryRun, force, validate } = options;

  if (!dryRun) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  console.log(`\nTarget : ${label} (${target})`);
  console.log(`Install: ${installDir}`);
  console.log(`Skills : ${skills.length}`);

  let installed = 0, skipped = 0, failed = 0;
  const meta = loadMeta(installDir);

  for (const skill of skills) {
    const slug = slugify(skill.name);
    const destFile = skillPath(installDir, slug);
    if (fs.existsSync(destFile) && !force) {
      console.log(`  SKIP  ${slug} (already exists, use --force to overwrite)`);
      skipped++;
      continue;
    }

    if (validate) {
      const content = fs.readFileSync(skill.fullPath, "utf8");
      const issues = validateSkill(content);
      if (issues.length > 0) {
        console.log(`  FAIL  ${slug} — validation errors:`);
        issues.forEach(issue => console.log(`         - ${issue}`));
        failed++;
        continue;
      }
    }

    if (dryRun) {
      console.log(`  Would install ${slug}`);
      console.log(`    src : ${skill.fullPath}`);
      console.log(`    dest: ${destFile}`);
      installed++;
      continue;
    }

    try {
      const skillDir = path.dirname(destFile);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.copyFileSync(skill.fullPath, destFile);
      const srcDir = path.dirname(skill.fullPath);
      for (const subdir of ["scripts", "references", "assets"]) {
        const srcSub = path.join(srcDir, subdir);
        const destSub = path.join(skillDir, subdir);
        if (fs.existsSync(srcSub) && fs.statSync(srcSub).isDirectory()) {
          fs.rmSync(destSub, { recursive: true, force: true });
          copyDirSync(srcSub, destSub);
        }
      }
      meta[slug] = {
        name: slug,
        source: skill.fullPath,
        filename: path.join(slug, "SKILL.md"),
        installed_at: new Date().toISOString(),
        directory: skill.dir,
      };
      installed++;
      console.log(`  OK    ${slug}`);
    } catch (err) {
      console.log(`  FAIL  ${slug} — ${err.message}`);
      failed++;
    }
  }

  if (!dryRun) {
    saveMeta(installDir, meta);
  }

  console.log(`${installed} installed, ${skipped} skipped, ${failed} failed.`);
  return { installed, skipped, failed };
}

// ── Commands ───────────────────────────────────────────────────────

function cmdInstall(args) {
  const flags = parseFlags(args, { target: "t", skills: "s", force: null, "dry-run": null, validate: null });
  const targets = resolveTargets(flags.target);
  const dryRun = flags["dry-run"] || false;
  const force = flags.force || false;

  // Find skills
  let skills = findSkillFiles();
  if (flags.skills) {
    const wanted = new Set(flags.skills.split(",").map(s => s.trim().toLowerCase()));
    skills = skills.filter(s => wanted.has(s.name.toLowerCase()) || wanted.has(slugify(s.name)));
  }

  console.log(`Installing ${skills.length} skill(s) to ${targets.length} target(s): ${targets.join(", ")}`);
  if (dryRun) console.log("[DRY RUN — no files will be written]");

  const totals = targets.reduce((summary, target) => {
    const result = installToTarget(target, skills, {
      dryRun,
      force,
      validate: flags.validate || false,
    });
    summary.installed += result.installed;
    summary.skipped += result.skipped;
    summary.failed += result.failed;
    return summary;
  }, { installed: 0, skipped: 0, failed: 0 });

  console.log(`\nTotal: ${totals.installed} installed, ${totals.skipped} skipped, ${totals.failed} failed.`);
  if (!dryRun && totals.installed > 0) {
    console.log("\nSkills are available to supported agents automatically and can be invoked by name.");
  }
  if (totals.failed > 0) {
    process.exitCode = 1;
  }
}

function cmdUninstall(args) {
  const flags = parseFlags(args, { target: "t" });
  const targets = resolveTargets(flags.target);
  const names = flags._.filter(n => n !== "uninstall");

  if (names.length === 0) {
    console.error("Usage: agent-skills uninstall <skill-name> [<skill-name>...] [-t all|claude|copilot|codex|gemini|antigravity|agents]");
    process.exit(2);
  }

  let removed = 0;
  for (const target of targets) {
    const installDir = TARGETS[target].installDir;
    const meta = loadMeta(installDir);
    console.log(`\nTarget: ${TARGETS[target].label} (${target})`);
    for (const name of names) {
      const slug = slugify(name);
      const skillDir = path.join(installDir, slug);
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
        delete meta[slug];
        console.log(`  Removed ${slug}`);
        removed++;
      } else {
        console.log(`  Not found: ${slug}`);
      }
    }
    if (fs.existsSync(installDir)) saveMeta(installDir, meta);
  }

  console.log(`\n${removed} skill(s) removed.`);
}

function cmdList(args) {
  const flags = parseFlags(args, { target: "t" });
  const targets = resolveTargets(flags.target);
  for (const target of targets) {
    const installDir = TARGETS[target].installDir;
    console.log(`\nInstalled skills (${target}) — ${installDir}`);
    if (!fs.existsSync(installDir)) {
      console.log("  None (directory does not exist).");
      continue;
    }
    const entries = Object.values(loadMeta(installDir));
    if (entries.length === 0) {
      console.log("  None.");
      continue;
    }
    console.log("  Name                          Installed At");
    console.log("  " + "-".repeat(60));
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const date = entry.installed_at ? entry.installed_at.slice(0, 19).replace("T", " ") : "unknown";
      console.log(`  ${entry.name.padEnd(30)} ${date}`);
    }
  }
}

function cmdDoctor(args) {
  runPythonScript("doctor.py", args);
}

function cmdRoute(args) {
  runPythonScript("route.py", args);
}

function cmdValidate(args) {
  runPythonScript("validate.py", args);
}

function cmdScore(args) {
  runPythonScript("score.py", args);
}

function cmdTest(args) {
  runPythonScript("test_skill.py", args);
}

function cmdBuildIndex(args) {
  runPythonScript("build_index.py", args);
}

function cmdHelp() {
  console.log(`
agent-skills — portable AI skills for Copilot, Claude, Codex, Gemini, and other agents

Usage:
  agent-skills <command> [options]

Commands:
  install              Install skills to all supported AI CLIs
    -t, --target       Target(s): "all", "agents", "claude", "copilot", "codex",
                       "gemini", or "antigravity" (comma-separated; default: all)
    -s, --skills       Comma-separated skill names (default: all)
    --force            Overwrite existing skills
    --dry-run          Preview without writing files
    --validate         Validate skills before installing

  uninstall <names>    Remove installed skills
    -t, --target       Target(s) to remove from (default: all)

  list                 List installed skills
    -t, --target       Target(s) to list (default: all)

  route "<prompt>"     Find the best skill for a task
    -n, --top-n        Number of results (default: 3)
    --json             Output as JSON
    --interactive      Interactive prompt mode

  doctor               Check health of installed skills
    -t, --target       Target: "agents", "claude", "copilot", "codex", "gemini",
                       or "antigravity" (default: all)

  validate             Lint all skill files
    --fix              Auto-fix known issues

  score                Score all skills on quality metrics
    --json             Output as JSON

  test                 Run adversarial tests on all skills

  build-index          Regenerate skills.json and skills-routing.json

Examples:
  npx agent-skills install                      # Install to every supported AI CLI
  npx agent-skills install -t copilot,codex     # Install to selected AI CLIs
  npx agent-skills install -t gemini -s CodeSage,TestCrafter
  npx agent-skills install -t antigravity       # Install all to Google Antigravity
  npx agent-skills route "review my Python code"
  npx agent-skills doctor
  npx agent-skills list
  npx agent-skills score --json > report.json
`);
}

// ── Utilities ──────────────────────────────────────────────────────

function parseFlags(args, aliases = {}) {
  const result = { _: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        result[key] = args[++i];
      } else {
        result[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const short = arg.slice(1);
      const long = Object.entries(aliases).find(([, v]) => v === short)?.[0];
      const key = long || short;
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        result[key] = args[++i];
      } else {
        result[key] = true;
      }
    } else {
      result._.push(arg);
    }
    i++;
  }
  return result;
}

function validateSkill(content) {
  const issues = [];
  if (!content.startsWith("---")) issues.push("Missing frontmatter (---)");
  if (!content.match(/^#{1}\s/m)) issues.push("No H1 heading found");
  if (!content.match(/^#{2}\s/m)) issues.push("No H2 section found");
  if (!content.includes("```")) issues.push("No code examples found");
  if (content.length < 500) issues.push("Content too short (< 500 chars)");
  return issues;
}

function loadMeta(installDir) {
  const metaPath = path.join(installDir, ".skills-meta.json");
  if (fs.existsSync(metaPath)) {
    try { return JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch (_) {}
  }
  return {};
}

function saveMeta(installDir, meta) {
  const metaPath = path.join(installDir, ".skills-meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
}

// ── Main ───────────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case "install":     cmdInstall(args); break;
  case "uninstall":   cmdUninstall(args); break;
  case "list":        cmdList(args); break;
  case "route":       cmdRoute(args); break;
  case "doctor":      cmdDoctor(args); break;
  case "validate":    cmdValidate(args); break;
  case "score":       cmdScore(args); break;
  case "test":        cmdTest(args); break;
  case "build-index": cmdBuildIndex(args); break;
  case "help":
  case "--help":
  case "-h":
  case undefined:     cmdHelp(); break;
  default:
    console.error(`Unknown command: ${command}\nRun "agent-skills help" for usage.`);
    process.exit(1);
}
