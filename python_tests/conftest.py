import json
from copy import deepcopy
from pathlib import Path

import pytest

from python_backend.app import create_app
from python_backend.config import Settings


class FakeStorage:
    def __init__(self):
        self.jobs = {}

    async def ping(self):
        return None

    async def create_job(self, job):
        self.jobs[job["id"]] = deepcopy(job)

    async def save_job(self, job):
        self.jobs[job["id"]] = deepcopy(job)

    async def get_job(self, job_id):
        return deepcopy(self.jobs.get(job_id))

    async def list_jobs(self):
        return []

    async def delete_job(self, job_id):
        self.jobs.pop(job_id, None)

    async def model_cost_summary(self, _):
        return {"calls": 0, "unknownCalls": 0}


class FakeGateway:
    def status(self):
        return {"configured": True, "configurationError": False, "model": None}

    def public_selection(self):
        return {"mode": "configured", "analysisModel": "fixture", "visionModel": None, "candidatesEnabled": False}

    async def complete(self, purpose, messages, **options):
        if not options.get("stream", False):
            if purpose == "input":
                question = json.loads(messages[1]["content"])["question"]
                mode = "D" if "比较" in question else "B"
                return json.dumps({"mode": mode, "reason": "合成测试的研究路径"}, ensure_ascii=False)
            if purpose == "researcher":
                return json.dumps(
                    {"objective": "回答研究问题", "hypotheses": [], "steps": ["核对证据与缺口"], "calculations": []},
                    ensure_ascii=False,
                )
            payload = json.loads(messages[1]["content"])
            return json.dumps(
                {
                    "report": payload["draft"],
                    "audit": "未发现越过证据或隐藏缺口。",
                    "decision": {
                        "action": payload["requiredFallback"]["action"],
                        "confidence": payload["requiredFallback"]["confidence"],
                        "summary": "结论仅覆盖证据包能够支持的范围。",
                        "falsifiers": ["官方披露冲突", "财务口径不一致", "关键现金流无法复算"],
                        "dataAsOf": payload["researchCutoff"],
                    },
                },
                ensure_ascii=False,
            )
        async def chunks():
            yield "# 证据缺口报告\n\n当前没有官方证据，保留缺口。"

        return chunks()


@pytest.fixture
def configured():
    settings = Settings(host="127.0.0.1", port=3001, root=Path.cwd(), initialize_services=False)
    storage = FakeStorage()
    return create_app(settings, storage=storage, gateway=FakeGateway()), storage
