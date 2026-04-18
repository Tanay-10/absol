"""Tests for the mock data generator."""

from seeds.generate_mock_data import generate, REGIONS, POLICY_TYPES, COVERED_PERILS


class TestGenerate:
    def test_output_is_valid_sql_transaction(self):
        sql = generate()
        assert sql.startswith("-- 003_mock_data.sql")
        assert "BEGIN;" in sql
        assert sql.strip().endswith("COMMIT;")

    def test_correct_total_policyholders(self):
        sql = generate()
        expected_count = sum(r.count for r in REGIONS)
        actual_count = sql.count("INSERT INTO policyholders")
        assert actual_count == expected_count, f"Expected {expected_count}, got {actual_count}"

    def test_every_policyholder_has_at_least_one_policy(self):
        sql = generate()
        ph_count = sql.count("INSERT INTO policyholders")
        pol_count = sql.count("INSERT INTO policies")
        assert pol_count >= ph_count, "Every policyholder should have >= 1 policy"

    def test_every_policy_has_at_least_one_location(self):
        sql = generate()
        pol_count = sql.count("INSERT INTO policies")
        loc_count = sql.count("INSERT INTO insured_locations")
        assert loc_count >= pol_count, "Every policy should have >= 1 location"

    def test_all_policy_types_used(self):
        sql = generate()
        for pt in POLICY_TYPES:
            assert f"'{pt}'" in sql, f"Policy type '{pt}' not found in output"

    def test_covered_perils_format(self):
        sql = generate()
        for pt, perils in COVERED_PERILS.items():
            for peril in perils:
                assert peril in sql, f"Peril '{peril}' not in output"

    def test_deterministic_output(self):
        sql1 = generate()
        sql2 = generate()
        assert sql1 == sql2, "Output should be deterministic (seeded random)"
