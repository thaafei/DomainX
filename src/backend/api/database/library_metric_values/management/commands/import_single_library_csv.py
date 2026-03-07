import csv
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from ....domain.models import Domain
from ....libraries.models import Library
from ....metrics.models import Metric
from ....library_metric_values.models import LibraryMetricValue


ROW_SOFTWARE_NAME = re.compile(r"^\s*Software\s*name\??\s*$", re.IGNORECASE)
ROW_SOURCE_CODE_URL = re.compile(r"^\s*Source\s*code\s*URL\??\s*$", re.IGNORECASE)
ROW_PROG_LANGS = re.compile(r"^\s*Programming\s*language\(s\)\??\s*$", re.IGNORECASE)

CANON_PUNCT_RE = re.compile(r"[^\w\s]")


def canon_metric(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("\u00a0", " ")
    s = s.replace("∗", "*")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"\*.*$", "", s)
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def clean_cell(v):
    if v is None:
        return None

    s = str(v).strip()
    if not s or s.lower() == "nan":
        return None

    while len(s) >= 2 and (
        (s[0] == '"' and s[-1] == '"') or
        (s[0] == "'" and s[-1] == "'")
    ):
        s = s[1:-1].strip()

    return s or None


def clean_url(u: str | None) -> str | None:
    u = clean_cell(u)
    if not u:
        return None
    return u[:-4] if u.endswith(".git") else u


def pick_first_choice(model_cls, field_name: str) -> str:
    f = model_cls._meta.get_field(field_name)
    choices = list(getattr(f, "choices", []) or [])
    if not choices:
        return ""
    return choices[0][0]


def read_single_library_csv(path: Path):

    rows = []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header

        for raw_row in reader:
            if not raw_row or len(raw_row) < 2:
                continue

            section = clean_cell(raw_row[0]) or ""
            metric = clean_cell(raw_row[1]) or ""

            parts = []
            for p in raw_row[2:]:
                cleaned = clean_cell(p)
                if cleaned:
                    parts.append(cleaned)

            response = ", ".join(parts) if parts else None

            if not metric:
                continue

            rows.append({
                "section": section,
                "metric": metric,
                "response": response,
            })

    return rows


@transaction.atomic
class Command(BaseCommand):
    help = (
        "Import a single-library CSV where each row is Section, Metric, Response. "
        "Creates or reuses a library, then upserts metric values."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="Path to CSV file")
        parser.add_argument("--domain-id", type=str, required=True, help="Domain_ID (char32)")
        parser.add_argument("--dry-run", action="store_true", help="Print actions but do not write DB")

    def handle(self, *args, **opts):
        csv_path = Path(opts["csv_path"]).expanduser()
        if not csv_path.exists():
            self.stderr.write(self.style.ERROR(f"File not found: {csv_path}"))
            return

        domain = Domain.objects.get(domain_ID=opts["domain_id"])
        rows = read_single_library_csv(csv_path)

        if not rows:
            self.stderr.write(self.style.ERROR("No usable rows found in CSV."))
            return

        row_by_key = {}
        for row in rows:
            key = canon_metric(row["metric"])
            if key and key not in row_by_key:
                row_by_key[key] = row

        lib_name_row = row_by_key.get(canon_metric("Software name"))
        repo_url_row = row_by_key.get(canon_metric("Source code URL"))
        langs_row = row_by_key.get(canon_metric("Programming language(s)"))

        if not lib_name_row or not clean_cell(lib_name_row["response"]):
            self.stderr.write(self.style.ERROR("Could not find 'Software name?' row in CSV."))
            return

        lib_name = clean_cell(lib_name_row["response"])
        repo_url = clean_url(repo_url_row["response"]) if repo_url_row else None
        langs = clean_cell(langs_row["response"]) if langs_row else None

        default_analysis_status = pick_first_choice(Library, "analysis_status")
        default_gitstats_status = pick_first_choice(Library, "gitstats_status")
        now = timezone.now()

        library = Library.objects.filter(
            domain_id=domain.domain_ID,
            library_name=lib_name,
        ).first()

        created_lib = False

        if library:
            if not opts["dry_run"]:
                library.url = repo_url
                library.programming_language = langs
                library.save(update_fields=["url", "programming_language"])
        else:
            created_lib = True
            if not opts["dry_run"]:
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

        skip_keys = {
            canon_metric("Software name"),
            canon_metric("Source code URL"),
            canon_metric("Programming language(s)"),
        }

        upserted_values = 0
        skipped_no_match = 0

        for row in rows:
            raw_metric_name = clean_cell(row["metric"])
            if not raw_metric_name:
                continue

            metric_key = canon_metric(raw_metric_name)
            if metric_key in skip_keys:
                continue

            metric_obj = metrics_by_key.get(metric_key)
            if not metric_obj:
                for key, m in metrics_by_key.items():
                    if metric_key in key or key in metric_key:
                        metric_obj = m
                        break

            if not metric_obj:
                skipped_no_match += 1
                continue

            cell_val = clean_cell(row["response"])
            if cell_val is None:
                continue

            payload = cell_val

            if not opts["dry_run"]:
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
            f"Done. created_lib={created_lib}, library='{lib_name}', "
            f"upserted_values={upserted_values}, skipped_metric_rows_no_match={skipped_no_match}"
        ))