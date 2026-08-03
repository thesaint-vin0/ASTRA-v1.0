/**
 * Accessibility audit service — DEVELOPMENT ONLY.
 *
 * Wraps axe-core behind a dynamic import so the audit engine and its
 * ~1MB payload are never included in production bundles. The DevDiagnostics
 * page imports this module on demand; the audit itself only runs when the
 * user explicitly triggers it.
 *
 * All APIs return plain serializable data so the results can be displayed,
 * copied to the clipboard, or exported as JSON without coupling the UI to
 * axe-core's internal types.
 */

export interface AxeViolationNode {
  target: string[]
  html: string
  impact: string
  failureSummary: string
}

export interface AxeViolation {
  id: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | string
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: AxeViolationNode[]
}

export interface AccessibilityAuditResult {
  timestamp: string
  passed: boolean
  violations: AxeViolation[]
  passesCount: number
  incompleteCount: number
  violationsCount: number
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  complianceMatrix: Array<{
    criterion: string
    status: 'pass' | 'fail' | 'review'
    violations: string[]
  }>
  pagesTested: string[]
}

const WCAG_MAPPING: Record<string, string> = {
  'wcag2a': 'WCAG 2.0 A',
  'wcag2aa': 'WCAG 2.0 AA',
  'wcag21a': 'WCAG 2.1 A',
  'wcag21aa': 'WCAG 2.1 AA',
  'wcag22aa': 'WCAG 2.2 AA',
  'best-practice': 'Best Practice',
  'section508': 'Section 508',
}

function getImpactLevel(impact: string): number {
  if (impact === 'critical') return 4
  if (impact === 'serious') return 3
  if (impact === 'moderate') return 2
  return 1
}

function severityOf(violation: AxeViolation): 'critical' | 'serious' | 'moderate' | 'minor' {
  const impact = violation.impact
  if (impact === 'critical' || impact === 'serious' || impact === 'moderate' || impact === 'minor') {
    return impact
  }
  // Fall back to the highest-impact node
  const nodeImpacts = violation.nodes.map((n) => n.impact)
  if (nodeImpacts.includes('critical')) return 'critical'
  if (nodeImpacts.includes('serious')) return 'serious'
  if (nodeImpacts.includes('moderate')) return 'moderate'
  return 'minor'
}

/** Sort violations from most to least severe. */
export function sortViolations(violations: AxeViolation[]): AxeViolation[] {
  return [...violations].sort((a, b) => {
    const byImpact = getImpactLevel(b.impact) - getImpactLevel(a.impact)
    if (byImpact !== 0) return byImpact
    return a.id.localeCompare(b.id)
  })
}

function buildComplianceMatrix(violations: AxeViolation[]): AccessibilityAuditResult['complianceMatrix'] {
  const matrix: Record<string, { status: 'pass' | 'fail' | 'review'; violations: string[] }> = {
    'WCAG 2.0 A': { status: 'pass', violations: [] },
    'WCAG 2.0 AA': { status: 'pass', violations: [] },
    'WCAG 2.1 A': { status: 'pass', violations: [] },
    'WCAG 2.1 AA': { status: 'pass', violations: [] },
    'WCAG 2.2 AA': { status: 'pass', violations: [] },
    'Best Practice': { status: 'pass', violations: [] },
    'Section 508': { status: 'pass', violations: [] },
  }

  for (const violation of violations) {
    for (const tag of violation.tags) {
      const criterion = WCAG_MAPPING[tag]
      if (!criterion || !matrix[criterion]) continue
      matrix[criterion].status = 'fail'
      matrix[criterion].violations.push(violation.id)
    }
  }

  return Object.entries(matrix).map(([criterion, value]) => ({
    criterion,
    status: value.violations.length > 0 ? 'fail' : value.status,
    violations: value.violations,
  }))
}

/**
 * Run an axe-core audit against the current page. Resolves to null when
 * running in a production build (the audit engine is intentionally absent).
 */
export async function runAccessibilityAudit(): Promise<AccessibilityAuditResult | null> {
  if (import.meta.env.PROD) return null

  // Dynamic import keeps axe-core out of production bundles.
  const axe = (await import('axe-core')).default

  const results = await axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    resultTypes: ['violations', 'passes', 'incomplete'],
  })

  const violations: AxeViolation[] = (results.violations || []).map((v: any) => ({
    id: v.id,
    impact: v.impact || 'minor',
    description: v.description || '',
    help: v.help || '',
    helpUrl: v.helpUrl || '',
    tags: v.tags || [],
    nodes: (v.nodes || []).map((n: any) => ({
      target: n.target || [],
      html: (n.html || '').slice(0, 300),
      impact: n.impact || 'minor',
      failureSummary: n.failureSummary || '',
    })),
  }))

  const summary = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const v of violations) {
    summary[severityOf(v)]++
  }

  return {
    timestamp: new Date().toISOString(),
    passed: violations.length === 0,
    violations: sortViolations(violations),
    passesCount: results.passes?.length ?? 0,
    incompleteCount: results.incomplete?.length ?? 0,
    violationsCount: violations.length,
    summary,
    complianceMatrix: buildComplianceMatrix(violations),
    pagesTested: [`${window.location.pathname}${window.location.search}`],
  }
}

/** Build a human-readable markdown report from an audit result. */
export function buildAuditReport(result: AccessibilityAuditResult): string {
  const lines: string[] = []
  lines.push('# Accessibility Audit Report')
  lines.push('')
  lines.push(`- **Generated:** ${new Date(result.timestamp).toLocaleString()}`)
  lines.push(`- **Page:** ${result.pagesTested.join(', ')}`)
  lines.push(`- **Status:** ${result.passed ? 'PASS' : 'FAIL'}`)
  lines.push(`- **Violations:** ${result.violationsCount}`)
  lines.push(`- **Checks passed:** ${result.passesCount}`)
  lines.push(`- **Needs review:** ${result.incompleteCount}`)
  lines.push('')
  lines.push('## Severity Summary')
  lines.push('')
  lines.push('| Severity | Count |')
  lines.push('|----------|-------|')
  lines.push(`| Critical | ${result.summary.critical} |`)
  lines.push(`| Serious  | ${result.summary.serious} |`)
  lines.push(`| Moderate | ${result.summary.moderate} |`)
  lines.push(`| Minor    | ${result.summary.minor} |`)
  lines.push('')
  lines.push('## WCAG Compliance Matrix')
  lines.push('')
  lines.push('| Criterion | Status | Violations |')
  lines.push('|-----------|--------|------------|')
  for (const row of result.complianceMatrix) {
    lines.push(`| ${row.criterion} | ${row.status} | ${row.violations.join(', ') || '—'} |`)
  }
  lines.push('')
  lines.push('## Violations')
  lines.push('')
  if (result.violations.length === 0) {
    lines.push('No violations detected.')
  } else {
    for (const v of result.violations) {
      lines.push(`### ${v.id} — ${v.impact.toUpperCase()}`)
      lines.push('')
      lines.push(v.description || v.help)
      lines.push('')
      lines.push(`- **Help:** ${v.helpUrl}`)
      lines.push(`- **Tags:** ${v.tags.join(', ')}`)
      lines.push('')
      lines.push('Affected nodes:')
      lines.push('')
      for (const node of v.nodes.slice(0, 10)) {
        lines.push(`- \`${node.target.join(' ')}\``)
        if (node.failureSummary) lines.push(`  - ${node.failureSummary.replace(/\n/g, ' ')}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

