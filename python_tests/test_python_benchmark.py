from benchmark.runner import run


def test_python_migration_benchmark_passes():
    result = run()
    assert result["passed"] is True
    assert len(result["results"]) == 5
