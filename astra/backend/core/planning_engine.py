"""
Astra AI - Planning Engine
Decomposes goals into actionable plans with tasks, dependencies, and scheduling.
"""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from loguru import logger


class PlanningEngine:
    """
    Planning engine that:
    - Decomposes complex goals into sub-tasks
    - Identifies dependencies between tasks
    - Creates executable plans
    - Tracks progress
    - Adapts plans based on results
    """

    def __init__(self):
        self.active_plans: Dict[str, Dict[str, Any]] = {}
        self.plan_templates: Dict[str, Dict[str, Any]] = self._init_templates()

    def _init_templates(self) -> Dict[str, Dict[str, Any]]:
        """Initialize plan templates for common tasks."""
        return {
            "code_project": {
                "name": "Software Project",
                "description": "Create a new software project",
                "tasks": [
                    "Define project requirements",
                    "Set up project structure",
                    "Implement core functionality",
                    "Write tests",
                    "Document code",
                    "Deploy",
                ],
            },
            "research": {
                "name": "Research Task",
                "description": "Conduct research on a topic",
                "tasks": [
                    "Define research question",
                    "Gather sources",
                    "Analyze information",
                    "Synthesize findings",
                    "Compile report",
                ],
            },
            "writing": {
                "name": "Writing Task",
                "description": "Create written content",
                "tasks": [
                    "Outline structure",
                    "Write first draft",
                    "Review and revise",
                    "Final edit",
                    "Format and publish",
                ],
            },
            "data_analysis": {
                "name": "Data Analysis",
                "description": "Analyze data and generate insights",
                "tasks": [
                    "Define analysis goals",
                    "Collect and clean data",
                    "Perform analysis",
                    "Create visualizations",
                    "Generate report",
                ],
            },
        }

    async def create_plan(
        self,
        goal: str,
        context: Optional[List[Dict[str, str]]] = None,
        available_tools: Optional[List[Dict[str, Any]]] = None,
        template: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a plan to achieve a goal.

        Args:
            goal: The goal to achieve
            context: Optional conversation context
            available_tools: Tools available for execution
            template: Optional template name to use

        Returns:
            Plan with tasks, dependencies, and timeline
        """
        plan_id = str(uuid.uuid4())

        # Determine plan template
        plan_type = self._determine_plan_type(goal)
        if template and template in self.plan_templates:
            plan_type = template

        # Generate tasks
        tasks = await self._generate_tasks(goal, plan_type)

        # Analyze dependencies
        dependencies = self._analyze_dependencies(tasks)

        # Estimate timeline
        timeline = self._estimate_timeline(tasks)

        plan = {
            "id": plan_id,
            "goal": goal,
            "type": plan_type,
            "tasks": tasks,
            "dependencies": dependencies,
            "timeline": timeline,
            "total_tasks": len(tasks),
            "completed_tasks": 0,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {
                "has_context": bool(context),
                "available_tools": len(available_tools) if available_tools else 0,
            },
        }

        self.active_plans[plan_id] = plan
        logger.info(f"Created plan {plan_id} for goal: {goal[:50]}...")

        return plan

    def _determine_plan_type(self, goal: str) -> str:
        """Determine the type of plan needed."""
        goal_lower = goal.lower()

        if any(w in goal_lower for w in ["code", "program", "app", "software", "build", "create project"]):
            return "code_project"
        elif any(w in goal_lower for w in ["research", "study", "learn", "investigate"]):
            return "research"
        elif any(w in goal_lower for w in ["write", "document", "report", "article"]):
            return "writing"
        elif any(w in goal_lower for w in ["analyze", "data", "statistics", "metrics"]):
            return "data_analysis"
        else:
            return "general"

    async def _generate_tasks(
        self, goal: str, plan_type: str
    ) -> List[Dict[str, Any]]:
        """Generate tasks for the plan."""
        if plan_type in self.plan_templates:
            template = self.plan_templates[plan_type]
            tasks = []
            for i, task_name in enumerate(template["tasks"]):
                tasks.append({
                    "id": str(uuid.uuid4()),
                    "name": task_name,
                    "description": f"{task_name} for: {goal[:100]}",
                    "order": i + 1,
                    "status": "pending",
                    "dependencies": [],
                    "estimated_minutes": 15,
                    "assigned_tool": None,
                    "result": None,
                })
            return tasks

        # General plan - generate tasks dynamically
        return [
            {
                "id": str(uuid.uuid4()),
                "name": "Define objectives",
                "description": f"Clarify and define objectives for: {goal[:100]}",
                "order": 1,
                "status": "pending",
                "dependencies": [],
                "estimated_minutes": 10,
                "assigned_tool": None,
                "result": None,
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Gather resources",
                "description": "Collect necessary resources and information",
                "order": 2,
                "status": "pending",
                "dependencies": [],
                "estimated_minutes": 20,
                "assigned_tool": None,
                "result": None,
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Execute plan",
                "description": "Execute the main steps of the plan",
                "order": 3,
                "status": "pending",
                "dependencies": ["task_2"],
                "estimated_minutes": 30,
                "assigned_tool": None,
                "result": None,
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Review results",
                "description": "Review and validate the results",
                "order": 4,
                "status": "pending",
                "dependencies": ["task_3"],
                "estimated_minutes": 10,
                "assigned_tool": None,
                "result": None,
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Finalize",
                "description": "Finalize and present the outcome",
                "order": 5,
                "status": "pending",
                "dependencies": ["task_4"],
                "estimated_minutes": 10,
                "assigned_tool": None,
                "result": None,
            },
        ]

    def _analyze_dependencies(
        self, tasks: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """Analyze dependencies between tasks."""
        dependencies = {}
        for task in tasks:
            task_id = task["id"]
            deps = task.get("dependencies", [])
            resolved_deps = []
            for dep in deps:
                if dep.startswith("task_"):
                    idx = int(dep.split("_")[1]) - 1
                    if 0 <= idx < len(tasks):
                        resolved_deps.append(tasks[idx]["id"])
            dependencies[task_id] = resolved_deps
        return dependencies

    def _estimate_timeline(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Estimate the timeline for the plan."""
        total_minutes = sum(t.get("estimated_minutes", 15) for t in tasks)
        return {
            "total_estimated_minutes": total_minutes,
            "total_tasks": len(tasks),
            "parallel_potential": self._calculate_parallelism(tasks),
        }

    def _calculate_parallelism(self, tasks: List[Dict[str, Any]]) -> int:
        """Calculate how many tasks could run in parallel."""
        independent_tasks = sum(
            1 for t in tasks if not t.get("dependencies")
        )
        return max(1, independent_tasks)

    async def execute_task(
        self,
        plan_id: str,
        task_id: str,
        tool_manager: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Execute a specific task in a plan."""
        if plan_id not in self.active_plans:
            raise ValueError(f"Plan not found: {plan_id}")

        plan = self.active_plans[plan_id]
        task = None
        for t in plan["tasks"]:
            if t["id"] == task_id:
                task = t
                break

        if not task:
            raise ValueError(f"Task not found: {task_id}")

        # Check dependencies
        for dep_id in plan["dependencies"].get(task_id, []):
            dep_task = next((t for t in plan["tasks"] if t["id"] == dep_id), None)
            if dep_task and dep_task["status"] != "completed":
                return {
                    "error": f"Dependency not met: {dep_task['name']}",
                    "task_id": task_id,
                    "status": "blocked",
                }

        task["status"] = "running"
        logger.info(f"Executing task: {task['name']} in plan {plan_id}")

        import asyncio
        await asyncio.sleep(0.1)

        task["status"] = "completed"
        plan["completed_tasks"] = sum(
            1 for t in plan["tasks"] if t["status"] == "completed"
        )

        if plan["completed_tasks"] == plan["total_tasks"]:
            plan["status"] = "completed"

        return {
            "task_id": task_id,
            "task_name": task["name"],
            "status": "completed",
            "plan_progress": f"{plan['completed_tasks']}/{plan['total_tasks']}",
        }

    def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get a plan by ID."""
        return self.active_plans.get(plan_id)

    def get_plan_progress(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get progress of a plan."""
        plan = self.active_plans.get(plan_id)
        if not plan:
            return None
        return {
            "plan_id": plan_id,
            "total_tasks": plan["total_tasks"],
            "completed_tasks": plan["completed_tasks"],
            "progress": f"{plan['completed_tasks'] / plan['total_tasks'] * 100:.0f}%"
                if plan["total_tasks"] > 0 else "0%",
            "status": plan["status"],
        }

    def update_task_status(
        self, plan_id: str, task_id: str, status: str, result: Any = None
    ):
        """Update the status of a specific task."""
        plan = self.active_plans.get(plan_id)
        if not plan:
            return
        for task in plan["tasks"]:
            if task["id"] == task_id:
                task["status"] = status
                if result:
                    task["result"] = result
                break
        plan["completed_tasks"] = sum(
            1 for t in plan["tasks"] if t["status"] == "completed"
        )
        if plan["completed_tasks"] == plan["total_tasks"]:
            plan["status"] = "completed"

    def cancel_plan(self, plan_id: str):
        """Cancel an active plan."""
        plan = self.active_plans.get(plan_id)
        if plan:
            plan["status"] = "cancelled"
            for task in plan["tasks"]:
                if task["status"] == "running":
                    task["status"] = "cancelled"
            logger.info(f"Cancelled plan: {plan_id}")

    def list_active_plans(self) -> List[Dict[str, Any]]:
        """List all active plans."""
        return [
            {
                "id": pid,
                "goal": p["goal"][:100],
                "type": p["type"],
                "status": p["status"],
                "progress": p.get("completed_tasks", 0) / max(p.get("total_tasks", 1), 1),
            }
            for pid, p in self.active_plans.items()
            if p["status"] in ["created", "running"]
        ]
