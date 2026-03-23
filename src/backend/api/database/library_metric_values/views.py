from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
import re
from datetime import datetime
import ahpy
import json
import os
import numpy as np


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

    raw = str(value).strip()

    if metric.value_type == "int":
        try:
            parsed = int(raw)
            return None, parsed
        except (TypeError, ValueError):
            return f"{metric.metric_name} must be a whole number.", None

    if metric.value_type == "float":
        try:
            parsed = float(raw)
            return None, parsed
        except (TypeError, ValueError):
            return f"{metric.metric_name} must be a valid number.", None

    if metric.value_type == "text":
        return None, raw

    if metric.value_type == "date":
        try:
            datetime.strptime(raw, "%Y-%m-%d")
            return None, raw
        except ValueError:
            return f"{metric.metric_name} must be a valid date in YYYY-MM-DD format.", None

    if metric.value_type == "time":
        for fmt in ("%H:%M", "%H:%M:%S"):
            try:
                datetime.strptime(raw, fmt)
                return None, raw
            except ValueError:
                continue
        return f"{metric.metric_name} must be a valid time in HH:MM or HH:MM:SS format.", None

    if metric.value_type == "datetime":
        try:
            datetime.strptime(raw, "%Y-%m-%dT%H:%M")
            return None, raw
        except ValueError:
            return f"{metric.metric_name} must be a valid date and time in YYYY-MM-DDTHH:MM format.", None

    return None, value

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
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
@permission_classes([IsAuthenticatedOrReadOnly])
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
            by_lib[lib_id]["metrics"][f"{metric_name}_description"] = val.description

    return Response(
        {
            "metrics": [
                {
                    "metric_ID": str(m.metric_ID),
                    "metric_name": m.metric_name,
                    "description": m.description,
                    "metric_key": m.metric_key,
                    "value_type": m.value_type,
                    "source_type": m.source_type,
                    "scoring_dict": m.scoring_dict,
                    "category": m.category
                }
                for m in metrics
            ],
            "libraries": table,
        },
        status=status.HTTP_200_OK,
    )


class LibraryMetricValueUpdateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    def post(self, request, library_id):
        library = get_object_or_404(Library, pk=library_id)

        metrics_data = request.data.get("metrics", {})
        if not isinstance(metrics_data, dict):
            return Response({"error": "metrics must be an object/dict"}, status=status.HTTP_400_BAD_REQUEST)

        for key, value in metrics_data.items():
            if key.endswith("_evidence"):
                metric_name = key.replace("_evidence", "")
                field_to_update = "evidence"
            elif key.endswith("_description"):
                metric_name = key.replace("_description", "")
                field_to_update = "description"
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
                    return Response({"error": f"{metric_name}: {error_message}"}, status=status.HTTP_400_BAD_REQUEST)
                value_to_store = validated_value

            LibraryMetricValue.objects.update_or_create(
                library=library,
                metric=metric,
                defaults={field_to_update: value_to_store},
            )

        return Response({"success": True}, status=status.HTTP_200_OK)


class MetricValueBulkUpdateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
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
    # The 9 qualities from the LBM paper
    PAPER_QUALITIES = [
        "Installability",
        "Correctness and Verifiability",
        "Surface Reliability",
        "Surface Robustness",
        "Surface Usability",
        "Maintainability",
        "Reusability",
        "Surface Understandability",
        "Visibility/Transparency"
    ]
    
    def get_library_scores_for_category(self, libraries, category_name, rules_data):
        """
        Calculate scores for all libraries in a category.
        """
        metrics = Metric.objects.filter(category=category_name)
        if not metrics.exists():
            return {}
        
        library_scores = {}
        for lib in libraries:
            total_score = 0
            for met in metrics:
                try:
                    val_obj = LibraryMetricValue.objects.get(library=lib, metric=met)
                    value = val_obj.value
                    
                    if met.option_category:
                        # Use rules.json for scoring
                        rule_set = (
                            rules_data.get(met.value_type, {})
                            .get(met.option_category, {})
                            .get("templates", {})
                            .get(met.rule, {})
                        )
                        total_score += rule_set.get(value, 0)
                    else:
                        # Direct numeric value
                        total_score += float(value or 0)
                        
                except (LibraryMetricValue.DoesNotExist, ValueError, TypeError):
                    continue
            
            # Ensure score is positive
            final_score = min(10.0, total_score) if total_score > 0 else 0.0001
            library_scores[lib.library_name] = final_score
        
        return library_scores
    
    def build_pairwise_matrix(self, library_scores):
        """
        Build pairwise comparison matrix using LBM paper's formula:
        A_jk = min(9, x_sub - y_sub + 1) if x_sub >= y_sub
        A_jk = 1 / min(9, y_sub - x_sub + 1) if x_sub < y_sub
        """
        # Convert to list for consistent ordering
        package_names = list(library_scores.keys())
        score_values = [library_scores[name] for name in package_names]
        n = len(package_names)
        
        # Build pairwise matrix A
        A = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i == j:
                    A[i][j] = 1
                else:
                    x_sub = score_values[i]
                    y_sub = score_values[j]
                    
                    if x_sub >= y_sub:
                        value = min(9, x_sub - y_sub + 1)
                        A[i][j] = value
                    else:
                        denominator = min(9, y_sub - x_sub + 1)
                        A[i][j] = 1 / denominator
        
        # Normalize columns
        B = np.zeros((n, n))
        for j in range(n):
            col_sum = np.sum(A[:, j])
            if col_sum > 0:
                B[:, j] = A[:, j] / col_sum
        
        # Calculate priority vector (average of rows)
        priority_vector = np.mean(B, axis=1)
        
        return {
            package_names[i]: round(priority_vector[i], 6)
            for i in range(n)
        }
    
    def get(self, request, domain_id):
        """
        Calculate AHP rankings using:
        1. Get raw scores for each category
        2. The LBM paper's pairwise comparison formula
        """
        domain = get_object_or_404(Domain, pk=domain_id)
        
        # Load rules.json
        rules_path = os.path.join(settings.BASE_DIR, "api", "database", "rules.json")
        cat_path = os.path.join(settings.BASE_DIR, "api", "database", "categories.json")
        
        with open(rules_path, "r") as f:
            rules_data = json.load(f)
        with open(cat_path, "r") as f:
            all_categories = json.load(f).get("Categories", [])
        
        libraries = Library.objects.filter(domain=domain)
        
        if not libraries.exists():
            return Response({
                "domain": domain.domain_name,
                "global_ranking": {},
                "category_details": {}
            })
        
        # Filter to only the 9 paper qualities
        categories_to_use = [c for c in self.PAPER_QUALITIES if c in all_categories]
        
        if not categories_to_use:
            return Response({
                "domain": domain.domain_name,
                "global_ranking": {lib.library_name: 0.0 for lib in libraries},
                "category_details": {}
            })
        
        # Get raw scores for each category
        category_raw_scores = {}
        for category_name in categories_to_use:
            category_raw_scores[category_name] = self.get_library_scores_for_category(
                libraries, category_name, rules_data
            )
        
        # Apply LBM paper's pairwise formula to get normalized scores
        category_normalized_scores = {}
        for category_name, raw_scores in category_raw_scores.items():
            if raw_scores:
                category_normalized_scores[category_name] = self.build_pairwise_matrix(raw_scores)
        
        # Get category weights from domain
        active_cat_names = list(category_normalized_scores.keys())
        raw_weights = {cat: domain.category_weights.get(cat, 1.0) for cat in active_cat_names}
        total_weight = sum(raw_weights.values()) or 1.0
        normalized_weights = {k: (v / total_weight) for k, v in raw_weights.items()}
        
        # Calculate overall scores using weighted sum
        global_ranking = {}
        for lib in libraries:
            lib_name = lib.library_name
            overall_score = 0
            for category_name, normalized_scores in category_normalized_scores.items():
                local_weight = normalized_scores.get(lib_name, 0)
                cat_priority = normalized_weights.get(category_name, 0)
                overall_score += local_weight * cat_priority
            global_ranking[lib_name] = round(overall_score, 6)
        
        # Save results to library
        for lib in libraries:
            lib_name = lib.library_name
            lib_cat_scores = {
                cat: normalized_scores.get(lib_name, 0)
                for cat, normalized_scores in category_normalized_scores.items()
            }
            lib.ahp_results = {
                "category_scores": lib_cat_scores,
                "overall_score": global_ranking.get(lib_name, 0),
            }
            lib.save(update_fields=["ahp_results"])
        
        return Response({
            "domain": domain.domain_name,
            "global_ranking": global_ranking,
            "category_details": category_normalized_scores,
            "raw_scores": category_raw_scores
        }, status=status.HTTP_200_OK)
