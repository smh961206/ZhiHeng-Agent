from io import BytesIO

import pytest
from docx import Document
from pypdf import PdfWriter

from python_backend.domain.contracts import ApiError
from python_backend.infrastructure.documents import read_document, read_document_with_vision


def test_text_and_docx_are_read_with_bounded_output():
    assert read_document("证据正文".encode(), "evidence.txt")["text"] == "证据正文"
    document = Document()
    document.add_paragraph("年度报告正文")
    stream = BytesIO()
    document.save(stream)
    result = read_document(stream.getvalue(), "report.docx")
    assert "年度报告正文" in result["text"]
    assert result["documentPipeline"] is True


def test_empty_and_unsupported_documents_remain_explicitly_missing():
    with pytest.raises(ApiError, match="没有可读取正文"):
        read_document(b"", "empty.txt")
    with pytest.raises(ApiError, match="不支持"):
        read_document(b"value", "unsafe.exe")


@pytest.mark.asyncio
async def test_scanned_pdf_uses_bounded_vision_and_stays_unverified():
    class Gateway:
        async def complete(self, purpose, messages, **options):
            assert purpose == "vision"
            assert messages[0]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
            return "营业收入 100（单位：百万元）"

    # The renderer is injected because rendering fidelity belongs to the runtime
    # dependency; this contract verifies the evidence classification boundary.
    pdf = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(pdf)
    result = await read_document_with_vision(pdf.getvalue(), "scan.pdf", Gateway(), renderer=lambda _: [b"png"])
    assert result["method"] == "vision"
    assert result["needsReview"] is True
    assert result["documentBlocks"][0]["needsReview"] is True
    assert "营业收入" in result["text"]


@pytest.mark.asyncio
async def test_identical_vision_pages_are_transcribed_once_but_keep_page_identity():
    class Gateway:
        def __init__(self):
            self.calls = 0

        async def complete(self, _purpose, _messages, **_options):
            self.calls += 1
            return "同一页转录"

    pdf = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.add_blank_page(width=100, height=100)
    writer.write(pdf)
    gateway = Gateway()
    result = await read_document_with_vision(pdf.getvalue(), "scan.pdf", gateway, renderer=lambda _: [b"same", b"same"])
    assert gateway.calls == 1
    assert [block["page"] for block in result["documentBlocks"]] == [1, 2]
    assert all(block["needsReview"] is True for block in result["documentBlocks"])
    assert result["documentBlocks"][0]["imageSha256"] == result["documentBlocks"][1]["imageSha256"]
