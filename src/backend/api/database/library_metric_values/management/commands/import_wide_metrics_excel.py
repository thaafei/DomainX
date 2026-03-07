import re
from pathlib import Path

import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from ....domain.models import Domain
from ....libraries.models import Library
from ....metrics.models import Metric
from ....library_metric_values.models import LibraryMetricValue


COL_METRIC = "Metrics & Description"
COL_POSSIBLE = "Possible Measurement Values"

ROW_SOFTWARE_NAME = re.compile(r"^\s*Software\s*name\?\s*$", re.IGNORECASE)
ROW_SOURCE_CODE_URL = re.compile(r"^\s*Source\s*code\s*URL\?\s*$", re.IGNORECASE)
ROW_PROG_LANGS = re.compile(r"^\s*Programming\s*language\(s\)\?\s*$", re.IGNORECASE)


CANON_PUNCT_RE = re.compile(r"[^\w\s]")


def canon_metric(s: str) -> str:

    s = (s or "").strip().lower()
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"\s+", " ", s)
    s = s.rstrip("?").strip()
    s = CANON_PUNCT_RE.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_cell(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() == "nan":
        return None
    return s


def find_row_index(df: pd.DataFrame, pattern: re.Pattern) -> int | None:
    for i, val in enumerate(df[COL_METRIC].astype(str).tolist()):
        if pattern.match(str(val).strip()):
            return i
    return None


def clean_url(u: str | None) -> str | None:
    if not u:
        return None
    u = u.strip()
    if u.lower() in {"nan", ""}:
        return None
    return u[:-4] if u.endswith(".git") else u


def pick_first_choice(model_cls, field_name: str) -> str:

    f = model_cls._meta.get_field(field_name)
    choices = list(getattr(f, "choices", []) or [])
    if not choices:
        return ""
    return choices[0][0]


@transaction.atomic
class Command(BaseCommand):
    help = (
        "Import a wide Excel sheet: metrics in rows, libraries in columns.\n"
        "Creates libraries from rows: Software name?, Source code URL?, Programming language(s)?\n"
        "Upserts metric values for all other rows by matching metrics_metric.metric_name flexibly."
    )

    def add_arguments(self, parser):
        parser.add_argument("xlsx_path", type=str, help="Path to the wide .xlsx file")
        parser.add_argument("--sheet", type=str, default=None, help="Sheet name (default: first)")
        parser.add_argument("--domain-id", type=str, required=True, help="Domain_ID (char32)")
        parser.add_argument("--dry-run", action="store_true", help="Print actions but do not write DB")

    def handle(self, *args, **opts):
        xlsx = Path(opts["xlsx_path"]).expanduser()
        if not xlsx.exists():
            self.stderr.write(self.style.ERROR(f"File not found: {xlsx}"))
            return

        domain = Domain.objects.get(domain_ID=opts["domain_id"])

        sheet = opts["sheet"]
        df = pd.read_excel(xlsx, sheet_name=0 if sheet is None else sheet)

        if COL_METRIC not in df.columns:
            self.stderr.write(self.style.ERROR(f"Missing column: '{COL_METRIC}'"))
            self.stderr.write(self.style.ERROR(f"Found columns: {list(df.columns)}"))
            return

        all_cols = list(df.columns)
        lib_cols = [c for c in all_cols if c not in (COL_METRIC, COL_POSSIBLE)]
        if not lib_cols:
            self.stderr.write(self.style.ERROR("No library columns detected (expected columns after first two)."))
            return

        idx_name = find_row_index(df, ROW_SOFTWARE_NAME)
        idx_repo = find_row_index(df, ROW_SOURCE_CODE_URL)
        idx_lang = find_row_index(df, ROW_PROG_LANGS)

        if idx_name is None:
            self.stderr.write(self.style.ERROR("Could not find row 'Software name?' (must match)."))
            return

        skip_metric_value_rows = {idx_name}
        if idx_repo is not None:
            skip_metric_value_rows.add(idx_repo)
        if idx_lang is not None:
            skip_metric_value_rows.add(idx_lang)

        metrics_by_key = {}
        collisions = {}
        for m in Metric.objects.all():
            key = canon_metric(m.metric_name)
            if key in metrics_by_key and metrics_by_key[key].metric_ID != m.metric_ID:
                collisions.setdefault(key, []).append(m.metric_name)
            else:
                metrics_by_key[key] = m

        if collisions:
            example_key = next(iter(collisions))
            self.stdout.write(self.style.WARNING(
                f"Warning: metric-name collisions after canonicalization. "
                f"Example key='{example_key}' -> {collisions[example_key]}"
            ))

        default_analysis_status = pick_first_choice(Library, "analysis_status")
        default_gitstats_status = pick_first_choice(Library, "gitstats_status")

        now = timezone.now()

        created_libs = 0
        existing_libs = 0
        upserted_values = 0
        skipped_values_no_match = 0

        for col in lib_cols:
            lib_name = clean_cell(df.at[idx_name, col])
            if not lib_name:
                continue
            lib_name = lib_name.strip()

            repo_url = clean_url(clean_cell(df.at[idx_repo, col])) if idx_repo is not None else None
            langs = clean_cell(df.at[idx_lang, col]) if idx_lang is not None else None

            library = Library.objects.filter(domain_id=domain.domain_ID, library_name=lib_name).first()
            library = Library.objects.filter(domain_id=domain.domain_ID, library_name=lib_name).first()
            if library:
                existing_libs += 1
                library.url = repo_url
                library.programming_language = langs
                library.save(update_fields=["url", "programming_language"])
            else:
                if opts["dry_run"]:
                    self.stdout.write(f"[DRY] create library: {lib_name} | github={repo_url} | langs={langs}")
                    created_libs += 1
                    continue

                library = Library.objects.create(
                    library_name=lib_name,
                    url=repo_url,
                    programming_language=langs,
                    domain_id=domain.domain_ID,
                    ahp_results={},
                    analysis_status=default_analysis_status,
                    gitstats_status=default_gitstats_status,
                    created_at=now,
                )
                created_libs += 1

            if opts["dry_run"]:
                continue

            for i in range(len(df)):
                if i in skip_metric_value_rows:
                    continue

                raw_metric_name = clean_cell(df.at[i, COL_METRIC])
                if not raw_metric_name:
                    continue

                metric_key = canon_metric(raw_metric_name)
                metric_obj = metrics_by_key.get(metric_key)

                if not metric_obj:
                    skipped_values_no_match += 1
                    continue

                cell_val = clean_cell(df.at[i, col])
                if cell_val is None:
                    continue

                payload = cell_val

                LibraryMetricValue.objects.update_or_create(
                    library_id=library.library_ID,
                    metric_id=metric_obj.metric_ID,
                    defaults={
                        "value": payload,
                        "last_modified": now,
                    },
                )
                upserted_values += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. created_libs={created_libs}, existing_libs={existing_libs}, "
            f"upserted_values={upserted_values}, skipped_metric_rows_no_match={skipped_values_no_match}"
        ))