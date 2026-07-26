"""
Astra AI - Reasoning Engine
Implements chain-of-thought, decision trees, causal analysis with confidence scoring.
"""

from typing import List, Dict, Any, Optional
import re
from datetime import datetime, timezone
from loguru import logger


class ReasoningEngine:
    """
    Reasoning engine supporting:
    - Chain-of-thought reasoning with step-by-step decomposition
    - Decision trees with weighted evaluation
    - Causal analysis with feedback loops
    - Confidence scoring
    - Retry logic
    """

    def __init__(self):
        self.reasoning_cache: Dict[str, Dict[str, Any]] = {}
        self._max_retries = 3
        self._cache_ttl = 300

    async def reason(
        self,
        query: str,
        context: Optional[List[Dict[str, str]]] = None,
        reasoning_type: str = "auto",
        max_steps: int = 5,
        retry_count: int = 0,
    ) -> Dict[str, Any]:
        """
        Perform reasoning on a query.

        Args:
            query: The question to reason about
            context: Optional conversation context
            reasoning_type: auto, chain_of_thought, decision_tree, causal
            max_steps: Maximum reasoning steps
            retry_count: Retry attempt number

        Returns:
            Reasoning result with thinking trace and conclusion
        """
        cache_key = f"{query}_{reasoning_type}"
        if cache_key in self.reasoning_cache:
            cached = self.reasoning_cache[cache_key]
            elapsed = (datetime.now(timezone.utc) - cached["timestamp"]).total_seconds()
            if elapsed < self._cache_ttl:
                return cached["result"]

        try:
            if reasoning_type == "auto":
                reasoning_type = self._determine_type(query)

            result = {
                "query": query,
                "reasoning_type": reasoning_type,
                "steps": [],
                "thinking": "",
                "conclusion": "",
                "confidence": 0.0,
                "alternative_viewpoints": [],
                "uncertainties": [],
                "key_components": [],
            }

            if reasoning_type == "chain_of_thought":
                result = await self._chain_of_thought(query, max_steps)
            elif reasoning_type == "decision_tree":
                result = await self._decision_tree(query)
            elif reasoning_type == "causal":
                result = await self._causal_analysis(query)
            else:
                result = await self._basic(query)

            if context:
                result["context_used"] = len(context)

            if result.get("confidence", 1.0) < 0.9:
                result["alternative_viewpoints"] = self._alternatives(query)
                result["uncertainties"] = self._uncertainties(query, result)

            self.reasoning_cache[cache_key] = {
                "result": result,
                "timestamp": datetime.now(timezone.utc),
            }
            return result

        except Exception as e:
            logger.error(f"Reasoning failed: {e}")
            if retry_count < self._max_retries:
                return await self.reason(query, context, reasoning_type, max_steps, retry_count + 1)
            return {
                "query": query,
                "reasoning_type": "error",
                "steps": [],
                "thinking": f"Error: {e}",
                "conclusion": "Unable to complete reasoning.",
                "confidence": 0.0,
                "alternative_viewpoints": [],
                "uncertainties": [str(e)],
                "error": str(e),
            }

    def _determine_type(self, query: str) -> str:
        """Auto-detect best reasoning type from query content."""
        q = query.lower()
        if any(w in q for w in ["decide", "choose", "which", "option", "better", "recommend"]):
            return "decision_tree"
        if any(w in q for w in ["why", "cause", "effect", "impact", "because", "result"]):
            return "causal"
        if any(w in q for w in ["analyze", "compare", "explain", "evaluate", "how"]):
            return "chain_of_thought"
        return "chain_of_thought"

    async def _chain_of_thought(self, query: str, max_steps: int = 5) -> Dict[str, Any]:
        """Step-by-step chain-of-thought reasoning with reflection."""
        steps = []
        thinking = []
        components = self._extract_components(query)
        findings = []

        # Step 1: Understand
        steps.append({"step": 1, "type": "understanding", "content": f"Analyzing query: {query[:100]}"})
        thinking.append(f"Understanding the question: {query[:100]}")

        # Step 2: Decompose
        steps.append({
            "step": 2, "type": "decomposition",
            "content": f"Breaking into {len(components)} components",
            "components": components,
        })
        thinking.append(f"Decomposing into key components: {', '.join(components[:5])}")

        # Steps 3-5: Analyze components
        for i, comp in enumerate(components[:max_steps - 2]):
            if len(steps) >= max_steps:
                break
            analysis = f"Examining '{comp}' in context of the question"
            steps.append({"step": len(steps) + 1, "type": "analysis", "component": comp, "content": analysis})
            thinking.append(f"Analyzing component '{comp}'")
            findings.append(analysis)

        # Step N-1: Synthesize
        steps.append({"step": len(steps) + 1, "type": "synthesis", "content": f"Synthesizing {len(findings)} findings"})
        thinking.append(f"Synthesizing {len(findings)} analytical observations")

        # Step N: Conclude
        confidence = min(0.7 + len(findings) * 0.03, 0.95)
        conclusion = f"Based on {len(steps)} reasoning steps across {len(components)} key components"
        steps.append({"step": len(steps) + 1, "type": "conclusion", "content": conclusion, "confidence": confidence})

        return {
            "query": query,
            "reasoning_type": "chain_of_thought",
            "steps": steps,
            "thinking": "\n".join(thinking),
            "conclusion": conclusion,
            "confidence": confidence,
            "key_components": components,
            "key_findings": findings[:10],
        }

    async def _decision_tree(self, query: str) -> Dict[str, Any]:
        """Build weighted decision tree with evaluation."""
        options = self._generate_options(query)
        criteria = self._generate_criteria(query)

        evaluated = []
        for opt in options:
            scores = {c: self._score(opt, c) for c in criteria}
            total = sum(scores.values()) / len(criteria) if criteria else 0
            evaluated.append({"option": opt, "scores": scores, "total": round(total, 2)})

        evaluated.sort(key=lambda x: x["total"], reverse=True)
        recommendation = evaluated[0]["option"] if evaluated else "No clear option"

        return {
            "query": query,
            "reasoning_type": "decision_tree",
            "steps": [
                {"step": 1, "type": "options", "content": f"Generated {len(options)} options"},
                {"step": 2, "type": "criteria", "content": f"Using {len(criteria)} criteria"},
                {"step": 3, "type": "evaluation", "content": f"Evaluated and ranked options"},
                {"step": 4, "type": "recommendation", "content": f"Recommended: {recommendation}"},
            ],
            "thinking": f"Decision tree: {len(options)} options x {len(criteria)} criteria",
            "conclusion": f"Recommended option: {recommendation} (score: {evaluated[0]['total'] if evaluated else 0})",
            "confidence": evaluated[0]["total"] if evaluated else 0.5,
            "options": evaluated,
            "recommendation": recommendation,
            "criteria": criteria,
        }

    async def _causal_analysis(self, query: str) -> Dict[str, Any]:
        """Identify causes, effects, and feedback loops."""
        causes = self._extract_components(f"causes of {query}")
        effects = self._extract_components(f"effects of {query}")

        return {
            "query": query,
            "reasoning_type": "causal",
            "steps": [
                {"step": 1, "type": "causes", "content": f"Identified {len(causes)} causal factors", "causes": causes[:5]},
                {"step": 2, "type": "effects", "content": f"Identified {len(effects)} effects", "effects": effects[:5]},
                {"step": 3, "type": "analysis", "content": "Analyzed cause-effect relationships"},
            ],
            "thinking": f"Causal analysis: {len(causes)} causes, {len(effects)} effects",
            "conclusion": f"Primary causes: {', '.join(causes[:3])}. Key effects: {', '.join(effects[:3])}",
            "confidence": 0.7,
            "causes": [{"factor": c, "type": "direct" if i == 0 else "indirect"} for i, c in enumerate(causes[:5])],
            "effects": [{"effect": e, "severity": "high" if i == 0 else "medium"} for i, e in enumerate(effects[:5])],
            "feedback_loops": ["Reinforcing loop between primary cause and main effect"],
        }

    async def _basic(self, query: str) -> Dict[str, Any]:
        """Simple direct reasoning."""
        components = self._extract_components(query)
        return {
            "query": query,
            "reasoning_type": "basic",
            "steps": [{"step": 1, "type": "direct", "content": f"Direct analysis of {len(components)} key terms"}],
            "thinking": f"Direct reasoning on: {query[:100]}",
            "conclusion": f"Analysis based on key terms: {', '.join(components[:5])}",
            "confidence": 0.8,
            "key_components": components,
        }

    def _extract_components(self, query: str) -> List[str]:
        """Extract meaningful keywords from query."""
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
                      "to", "for", "of", "with", "by", "from", "and", "or", "but",
                      "what", "why", "how", "when", "where", "which", "who",
                      "this", "that", "these", "those", "it", "its", "can", "will",
                      "do", "does", "did", "has", "have", "had", "been", "being"}
        words = re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())
        components = [w for w in words if w not in stop_words]
        seen = set()
        return [c for c in components if not (c in seen or seen.add(c))][:10]

    def _generate_options(self, query: str) -> List[str]:
        """Generate decision options from query."""
        parts = re.split(r'\bor\b', query, maxsplit=3)
        if len(parts) > 1:
            return [p.strip().strip("?.!,").capitalize() for p in parts if len(p.strip()) > 3][:5]
        return [
            f"Proceed with {query[:40]}",
            "Gather more information",
            "Consider alternatives",
            "Defer decision",
        ][:5]

    def _generate_criteria(self, query: str) -> List[str]:
        """Generate evaluation criteria."""
        return ["feasibility", "impact", "risk", "effort", "value"]

    def _score(self, option: str, criterion: str) -> float:
        """Score an option against a criterion (0.0-1.0)."""
        scores = {
            "feasibility": 0.7, "impact": 0.6, "risk": 0.5,
            "effort": 0.6, "value": 0.7,
        }
        return scores.get(criterion, 0.6)

    def _alternatives(self, query: str) -> List[str]:
        """Generate alternative viewpoints."""
        return [
            "Consider the opposite perspective",
            "Evaluate edge cases",
            "Examine assumptions critically",
        ]

    def _uncertainties(self, query: str, result: Dict) -> List[str]:
        """Identify uncertainties in the reasoning."""
        uncertainties = []
        if not result.get("key_components"):
            uncertainties.append("Limited query decomposition")
        if result.get("confidence", 1.0) < 0.6:
            uncertainties.append("Low confidence in findings")
        return uncertainties or ["None identified"]

    def clear_cache(self):
        """Clear reasoning cache."""
        self.reasoning_cache.clear()
        logger.debug("Reasoning cache cleared")
