---
name: workspace-setup
description: B1_02 phase workspace setup protocol including npm outdated, npm audit, TypeScript version validation, quality gates enforcement. Ensures dependencies current, security patches applied, and workspace ready for implementation.
allowed-tools: Read, Bash, Write
---

# Workspace Setup (B1_02)

WORKSPACE_SETUP_MANDATE::[
  PHASE::B1_02_workspace_architect,
  PRINCIPLE::"Quality_gates_before_code"≠"quality_gates_after_code",
  ENFORCEMENT::no_src_files_without_passing[lint, typecheck, test],
  POLICY::/Volumes/HestAI/docs/standards/106-SYSTEM-CODE-QUALITY-ENFORCEMENT-GATES.md
]

---

## CRITICAL CHECKLIST (BEFORE ANY src/ CODE)

```octave
REQUIRED_FILES::[
  package.json[with_lint,typecheck,test,build_scripts],
  tsconfig.json[strict:true, noUnusedLocals:true, noUnusedParameters:true],
  .eslintrc.cjs[typescript_parser, @typescript-eslint/recommended],
  .prettierrc[formatting_rules],
  vitest.config.ts_or_jest.config.js[coverage_configured],
  .github/workflows/ci.yml[lint+typecheck+test+build],
  .gitignore[node_modules,dist,.env,coverage],
  .env.example[required_variables_documented]
]

VERIFICATION::MANDATORY_BEFORE_PROCEEDING[
  npm run lint→0_errors,
  npm run typecheck→0_errors,
  npm run test→ALL_pass
]

EVIDENCE_REQUIRED::[
  screenshot_lint_pass,
  screenshot_typecheck_pass,
  screenshot_test_pass,
  github_ci_green_checkmark
]
```

---

## SETUP SEQUENCE

```octave
STEP_1_DIRECTORIES::[
  mkdir -p {project-name}/{sessions,coordination,dev,staging,production}
]

STEP_2_SESSION_MIGRATION[if_D0_graduation]::[
  check::manifest.json_graduation_approved,
  copy::0-ideation/{TOPIC}/→sessions/,
  action::record_in_coordination/
]

STEP_3_COORDINATION_REPO::[
  cd coordination && git init,
  mkdir -p {workflow-docs,phase-reports,planning-docs},
  create::PROJECT-CONTEXT.md+CHARTER.md+ASSIGNMENTS.md,
  commit::"feat: initialize coordination repository"
]

STEP_4_DEV_REPO::[
  cd ../dev && git init,
  create::src/tests/docs/reports/ directories,
  create::.gitignore with_node_modules+dist+.env+coverage,
  create::README.md,
  commit::"feat: initialize dev repository"
]

STEP_5_DEPLOYMENT_REPOS::[
  git clone dev staging,
  git clone dev production
]

STEP_6_COORDINATION_SYMLINK::[
  cd dev && ln -s ../coordination .coord,
  git add .coord,
  commit::"feat: add coordination context symlink"
]

VERIFICATION_GATE::[
  npm install,
  npm run lint→✅,
  npm run typecheck→✅,
  npm run test→✅,
  npm run build→✅,
  IF[all_pass]→proceed_B1_03 ELSE[fix_infrastructure_first]
]
```

---

## QUALITY GATE SCRIPTS

**package.json:**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "build": "tsc"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**.eslintrc.cjs:**
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error'
  }
};
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'json', 'html'], exclude: ['node_modules/', 'tests/'] }
  }
});
```

**.github/workflows/ci.yml:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

---

## DEPENDENCY VALIDATION

```octave
MONTHLY_MAINTENANCE::[
  npm outdated→check_versions,
  npm audit→check_security,
  npm update→apply_semver_updates,
  npm audit fix→patch_vulnerabilities,
  typescript_version_sync::[
    npx tsc --version,
    npm ls @typescript-eslint/parser,
    IF[version_mismatch]→install_latest_parser_plugin
  ],
  npm run lint && npm run typecheck && npm run test→revalidate,
  git_commit::"chore: update dependencies and fix audit issues"
]
```

---

## ANTI-PATTERNS

```octave
NEVER::[
  src_files_before_infrastructure→FAIL,
  "we'll_add_tests_later"→VIOLATION,
  skip_npm_audit_warnings→SECURITY_RISK,
  different_local_ci_commands→CI_MISMATCH,
  suppressions_without_justification→QUALITY_DEBT
]

ALWAYS::[
  infrastructure_first→code_second,
  quality_gates_green→before_phase_transition,
  dependency_audit_monthly→security_hygiene,
  typescript_version_sync→parser_consistency
]
```

---

## CLEAN SLATE PROTOCOL

```octave
TRIGGERS::[
  >100_lint_type_errors_late,
  quality_gates_never_ran,
  fundamental_architecture_issues
]

DECISION::[
  IF[rebuild_time < 2×fix_time]→rebuild_from_scratch,
  ELSE→systematic_remediation,
  DOCUMENT::lessons_learned_in_/reports/retrospectives/
]
```
