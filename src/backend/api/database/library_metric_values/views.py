from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404

import ahpy
import json
import os

from ..domain.models import Domain
from ..libraries.models import Library
from ..metrics.models import Metric
from .models import LibraryMetricValue
from ...utils.analysis import enqueue_library_analysis


def validate_metric_value(metric, value):
    if value in ("", None):
        return None, None

    if metric.metric_key == "gitstats_report":
        return "This metric is read-only and cannot be edited manually.", None

    if metric.scoring_dict and isinstance(metric.scoring_dict, dict):
        allowed_values = [str(k) for k in metric.scoring_dict.keys()]
        if str(value) not in allowed_values:
            return f"{metric.metric_name} must be one of: {', '.join(allowed_values)}.", None
        return None, value

    if metric.value_type == "int":
        try:
            parsed = int(str(value).strip())
            return None, parsed
        except (TypeError, ValueError):
            return f"{metric.metric_name} must be a whole number.", None

    if metric.value_type == "float":
        try:
            parsed = float(str(value).strip())
            return None, parsed
        except (TypeError, ValueError):
            return f"{metric.metric_name} must be a valid number.", None

    if metric.value_type == "text":
        return None, value

    return None, value


@api_view(["POST"])
def analyze_library(request, library_id):
    lib = get_object_or_404(Library, pk=library_id)

    try:
        result = enqueue_library_analysis(lib)
        if result is None:
            return Response({"error": lib.analysis_error}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Analysis queued.",
                "library_id": str(lib.library_ID),
                "analysis_task_id": result.get("analysis_task_id"),
                "gitstats_task_id": result.get("gitstats_task_id"),
            },
            status=status.HTTP_202_ACCEPTED,
        )
    except Exception as e:
        lib.analysis_status = Library.ANALYSIS_FAILED
        lib.analysis_error = str(e)
        lib.save(update_fields=["analysis_status", "analysis_error"])
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def analyze_domain_libraries(request, domain_id):
    domain = get_object_or_404(Domain, pk=domain_id)
    libs = Library.objects.filter(domain=domain)

    queued, failed = [], []

    for lib in libs:
        try:
            result = enqueue_library_analysis(lib)
            if result:
                queued.append(
                    {
                        "library_id": str(lib.library_ID),
                        "analysis_task_id": result.get("analysis_task_id"),
                        "gitstats_task_id": result.get("gitstats_task_id"),
                    }
                )
            else:
                failed.append({"library_id": str(lib.library_ID), "error": lib.analysis_error})
        except Exception as e:
            lib.analysis_status = Library.ANALYSIS_FAILED
            lib.analysis_error = str(e)
            lib.save(update_fields=["analysis_status", "analysis_error"])
            failed.append({"library_id": str(lib.library_ID), "error": str(e)})

    return Response(
        {
            "message": "Analysis queued for domain libraries.",
            "queued": queued,
            "failed": failed,
            "total": libs.count(),
        },
        status=status.HTTP_202_ACCEPTED,
    )


@api_view(["GET"])
def domain_comparison(request, domain_id):
    domain = get_object_or_404(Domain, pk=domain_id)

    libraries = Library.objects.filter(domain=domain)
    metrics = Metric.objects.all()

    table = []
    by_lib = {}

    for lib in libraries:
        row = {
            "library_ID": str(lib.library_ID),
            "library_name": lib.library_name,
            "github_url": lib.github_url,
            "url": lib.url,
            "programming_language": lib.programming_language,
            "analysis_status": lib.analysis_status,
            "analysis_task_id": lib.analysis_task_id,
            "analysis_error": lib.analysis_error,
            "analysis_finished_at": lib.analysis_finished_at,
            "gitstats_status": getattr(lib, "gitstats_status", None),
            "gitstats_task_id": getattr(lib, "gitstats_task_id", None),
            "gitstats_error": getattr(lib, "gitstats_error", None),
            "gitstats_finished_at": getattr(lib, "gitstats_finished_at", None),
            "gitstats_report_url": (
                f"/gitstats/{lib.library_ID}/git_stats/index.html"
                if getattr(lib, "gitstats_status", None) == Library.GITSTATS_SUCCESS
                else None
            ),
            "metrics": {m.metric_name: None for m in metrics},
        }
        table.append(row)
        by_lib[row["library_ID"]] = row

    values = (
        LibraryMetricValue.objects.filter(library__in=libraries).select_related("library", "metric")
    )

    for val in values:
        lib_id = str(val.library.library_ID)
        metric_name = val.metric.metric_name
        if lib_id in by_lib:
            by_lib[lib_id]["metrics"][metric_name] = val.value
            by_lib[lib_id]["metrics"][f"{metric_name}_evidence"] = val.evidence

    return Response(
        {
            "metrics": [
                {
                    "metric_ID": str(m.metric_ID),
                    "metric_name": m.metric_name,
                    "metric_key": m.metric_key,
                    "value_type": m.value_type,
                    "source_type": m.source_type,
                    "scoring_dict": m.scoring_dict,
                }
                for m in metrics
            ],
            "libraries": table,
        },
        status=status.HTTP_200_OK,
    )


class LibraryMetricValueUpdateView(APIView):
    def post(self, request, library_id):
        library = get_object_or_404(Library, pk=library_id)

        metrics_data = request.data.get("metrics", {})
        if not isinstance(metrics_data, dict):
            return Response({"error": "metrics must be an object/dict"}, status=status.HTTP_400_BAD_REQUEST)

        for key, value in metrics_data.items():
            if key.endswith("_evidence"):
                metric_name = key.replace("_evidence", "")
                field_to_update = "evidence"
            else:
                metric_name = key
                field_to_update = "value"

            value_to_store = None if value in ("", None) else value

            metric = Metric.objects.filter(metric_name=metric_name).first()
            if not metric or metric.metric_key == "gitstats_report":
                continue

            if field_to_update == "value":
                error_message, validated_value = validate_metric_value(metric, value_to_store)
                if error_message:
                    return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)
                value_to_store = validated_value

            LibraryMetricValue.objects.update_or_create(
                library=library,
                metric=metric,
                defaults={field_to_update: value_to_store},
            )

        return Response({"success": True}, status=status.HTTP_200_OK)


class MetricValueBulkUpdateView(APIView):
    def post(self, request):
        updates = request.data

        if not isinstance(updates, list):
            return Response({"error": "Expected a list of updates."}, status=status.HTTP_400_BAD_REQUEST)
        if not updates:
            return Response({"status": "No data received to update."}, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                for item in updates:
                    library_id = item.get("library_id")
                    metric_id = item.get("metric_id")
                    value = item.get("value")

                    if not library_id or not metric_id:
                        continue

                    value_to_store = None if value in ("", None) else value

                    library = get_object_or_404(Library, pk=library_id)
                    metric = get_object_or_404(Metric, pk=metric_id)

                    if metric.metric_key == "gitstats_report":
                        continue

                    error_message, validated_value = validate_metric_value(metric, value_to_store)
                    if error_message:
                        return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

                    LibraryMetricValue.objects.update_or_create(
                        library=library,
                        metric=metric,
                        defaults={"value": validated_value},
                    )

            return Response(
                {"status": f"Successfully updated {len(updates)} metric values."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Bulk update failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AHPCalculations(APIView):
    def get(self, request, domain_id):
        domain = get_object_or_404(Domain, pk=domain_id)

        rules_path = os.path.join(settings.BASE_DIR, "api", "database", "rules.json")
        cat_path = os.path.join(settings.BASE_DIR, "api", "database", "categories.json")

        with open(rules_path, "r") as f:
            rules_data = json.load(f)
        with open(cat_path, "r") as f:
            all_categories = json.load(f).get("Categories", [])

        libraries = Library.objects.filter(domain=domain)

        category_ahp = []
        for category_name in all_categories:
            metrics = Metric.objects.filter(category=category_name)
            if not metrics.exists():
                continue

            library_scores = {}
            for lib in libraries:
                total_score = 0
                for met in metrics:
                    try:
                        val_obj = LibraryMetricValue.objects.get(library=lib, metric=met)
                        value = val_obj.value

                        if met.option_category:
                            rule_set = (
                                rules_data.get(met.value_type, {})
                                .get(met.option_category, {})
                                .get("templates", {})
                                .get(met.rule, {})
                            )
                            total_score += rule_set.get(value, 0)
                        else:
                            total_score += float(value or 0)

                    except (LibraryMetricValue.DoesNotExist, ValueError, TypeError):
                        continue

                library_scores[lib.library_name] = total_score if total_score > 0 else 0.0001

            if library_scores:
                category_ahp.append(
                    ahpy.Compare(name=category_name, comparisons=library_scores, precision=4)
                )

        active_cat_names = [c.name for c in category_ahp]
        raw_weights = {cat: domain.category_weights.get(cat, 1.0) for cat in active_cat_names}
        total_weight = sum(raw_weights.values()) or 1.0
        normalized_weights = {k: (v / total_weight) for k, v in raw_weights.items()}

        global_rank = {}
        for lib in libraries:
            lib_name = lib.library_name
            overall_score = 0
            lib_cat_scores = {}

            for child in category_ahp:
                local_weight = child.target_weights.get(lib_name, 0)
                cat_priority = normalized_weights.get(child.name, 0)
                overall_score += local_weight * cat_priority
                lib_cat_scores[child.name] = local_weight

            global_rank[lib_name] = round(overall_score, 4)

            lib.ahp_results = {
                "category_scores": lib_cat_scores,
                "overall_score": global_rank[lib_name],
            }
            lib.save(update_fields=["ahp_results"])

        return Response(
            {
                "domain": domain.domain_name,
                "global_ranking": global_rank,
                "category_details": {c.name: c.target_weights for c in category_ahp},
            },
            status=status.HTTP_200_OK,
        )