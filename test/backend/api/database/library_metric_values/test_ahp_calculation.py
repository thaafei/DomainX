import pytest
import json
from unittest.mock import patch, mock_open
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse

from api.database.domain.models import Domain
from api.database.libraries.models import Library
from api.database.metrics.models import Metric
from api.database.library_metric_values.models import LibraryMetricValue
from api.database.library_metric_values.views import AHPCalculations



@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def ahp_qualities():
    return [
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


@pytest.mark.django_db
def test_ahp_calculations_success(api_client, ahp_qualities):
    # Setup Domain with weights for a valid AHP quality
    domain = Domain.objects.create(
        domain_name="AHP Test Domain",
        category_weights={"Installability": 1.0}
    )

    # Setup Metric and Library for Installability
    metric = Metric.objects.create(
        metric_name="Installation Instructions",
        category="Installability",
        value_type="numeric",
        rule="default"
    )
    library = Library.objects.create(
        domain=domain,
        library_name="TestLib"
    )

    # Assign a value to the library for that metric
    LibraryMetricValue.objects.create(
        library=library,
        metric=metric,
        value="85"
    )

    # Mock the JSON files (rules.json and categories.json)
    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        # Call the API
        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["domain"] == "AHP Test Domain"
    assert "global_ranking" in data
    assert "TestLib" in data["global_ranking"]
    
    # Verify the object was actually saved in the database
    library.refresh_from_db()
    assert library.ahp_results is not None
    # Check for overall_score
    # Your implementation might store it under 'overall_score' or directly in global_ranking
    if "overall_score" in library.ahp_results:
        assert library.ahp_results["overall_score"] > 0
    else:
        # If stored differently, check that category_scores exist
        assert "category_scores" in library.ahp_results


@pytest.mark.django_db
def test_ahp_calculations_not_found(api_client):
    """Test with a domain ID that doesn't exist"""
    url = reverse("values-ahp", kwargs={"domain_id": "00000000-0000-0000-0000-000000000000"})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_ahp_calculations_with_weighted_categories(api_client, ahp_qualities):
    """
    Test AHP calculations with weighted categories using valid AHP qualities.
    """
    # Setup Domain with weights for valid AHP qualities
    weights = {
        "Installability": 0.6,
        "Maintainability": 0.4
    }
    domain = Domain.objects.create(
        domain_name="Weighted Domain",
        category_weights=weights
    )

    # Setup Metrics for both categories
    install_metric = Metric.objects.create(
        metric_name="Installation Instructions",
        category="Installability",
        value_type="numeric",
        rule="default"
    )

    maintain_metric = Metric.objects.create(
        metric_name="Code Comments",
        category="Maintainability",
        value_type="numeric",
        rule="default"
    )
    
    library = Library.objects.create(domain=domain, library_name="TestLib")

    # Assign values
    LibraryMetricValue.objects.create(library=library, metric=install_metric, value="80")
    LibraryMetricValue.objects.create(library=library, metric=maintain_metric, value="90")

    # Mock JSON to include both categories
    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability", "Maintainability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    # Assertions
    assert response.status_code == 200
    data = response.json()
    
    # Verify that the response includes details for both categories
    assert "Installability" in data["category_details"]
    assert "Maintainability" in data["category_details"]
    
    # Check that results were saved to the library model
    library.refresh_from_db()
    assert library.ahp_results is not None
    # Check for category scores
    if "category_scores" in library.ahp_results:
        assert "Installability" in library.ahp_results["category_scores"]
        assert "Maintainability" in library.ahp_results["category_scores"]


@pytest.mark.django_db
def test_ahp_calculations_with_single_package(api_client, ahp_qualities):
    """
    Test AHP calculations with a single package
    """
    domain = Domain.objects.create(
        domain_name="Single Package Domain",
        category_weights={"Installability": 1.0}
    )

    metric = Metric.objects.create(
        metric_name="Installation Instructions",
        category="Installability",
        value_type="numeric",
        rule="default"
    )
    
    library = Library.objects.create(
        domain=domain,
        library_name="OnlyLib"
    )

    LibraryMetricValue.objects.create(
        library=library,
        metric=metric,
        value="75"
    )

    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    assert response.status_code == 200
    data = response.json()
    
    assert "global_ranking" in data
    assert "OnlyLib" in data["global_ranking"]
    # With a single package, the normalized score should be 1.0
    assert data["global_ranking"]["OnlyLib"] == 1.0


@pytest.mark.django_db
def test_ahp_calculations_with_no_metrics(api_client, ahp_qualities):
    """
    Test AHP calculations when a category has no metrics.
    Should handle gracefully without errors.
    """
    domain = Domain.objects.create(
        domain_name="No Metrics Domain",
        category_weights={"Installability": 1.0}
    )

    library = Library.objects.create(
        domain=domain,
        library_name="EmptyLib"
    )

    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    assert response.status_code == 200
    data = response.json()
    
    assert "global_ranking" in data
    assert "EmptyLib" in data["global_ranking"]
    # With no metrics, the score should be 0.0
    assert data["global_ranking"]["EmptyLib"] == 0.0


@pytest.mark.django_db
def test_ahp_calculations_with_equal_weights(api_client, ahp_qualities):
    """
    Test AHP calculations when all categories have equal weights.
    """
    # Create weights for 3 valid AHP qualities
    weights = {
        "Installability": 1.0,
        "Maintainability": 1.0,
        "Reusability": 1.0
    }
    domain = Domain.objects.create(
        domain_name="Equal Weights Domain",
        category_weights=weights
    )

    # Create metrics for each category
    install_metric = Metric.objects.create(
        metric_name="Install Instructions",
        category="Installability",
        value_type="numeric",
        rule="default"
    )
    
    maintain_metric = Metric.objects.create(
        metric_name="Code Comments",
        category="Maintainability",
        value_type="numeric",
        rule="default"
    )
    
    reuse_metric = Metric.objects.create(
        metric_name="Modularity",
        category="Reusability",
        value_type="numeric",
        rule="default"
    )
    
    library = Library.objects.create(domain=domain, library_name="TestLib")

    # Assign equal values to all metrics
    LibraryMetricValue.objects.create(library=library, metric=install_metric, value="50")
    LibraryMetricValue.objects.create(library=library, metric=maintain_metric, value="50")
    LibraryMetricValue.objects.create(library=library, metric=reuse_metric, value="50")

    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability", "Maintainability", "Reusability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    assert response.status_code == 200
    data = response.json()
    
    assert data["global_ranking"]["TestLib"] > 0


@pytest.mark.django_db
def test_ahp_calculations_response_structure(api_client, ahp_qualities):
    """
    Test that the response structure matches what the frontend expects.
    """
    domain = Domain.objects.create(
        domain_name="Structure Test",
        category_weights={"Installability": 1.0}
    )

    metric = Metric.objects.create(
        metric_name="Install Instructions",
        category="Installability",
        value_type="numeric",
        rule="default"
    )
    
    library = Library.objects.create(
        domain=domain,
        library_name="TestLib"
    )

    LibraryMetricValue.objects.create(
        library=library,
        metric=metric,
        value="80"
    )

    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Installability"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    assert response.status_code == 200
    data = response.json()
    
    # Check required fields
    assert "domain" in data
    assert "global_ranking" in data
    assert "category_details" in data
    
    # Check that category_details contains the category
    assert "Installability" in data["category_details"]
    
    # Check that global_ranking has the library
    assert "TestLib" in data["global_ranking"]
    
    # Check that values are numbers
    assert isinstance(data["global_ranking"]["TestLib"], (int, float))

@pytest.mark.django_db
def test_ahp_only_uses_paper_qualities(api_client):

    domain = Domain.objects.create(
        domain_name="AHP Filter Test",
        category_weights={}
    )
    
    lib_a = Library.objects.create(domain=domain, library_name="PackageA")
    lib_b = Library.objects.create(domain=domain, library_name="PackageB")
    
    ahp_qualities = AHPCalculations.PAPER_QUALITIES
    
    # Create metrics for AHP qualities
    ahp_metrics = {}
    for quality in ahp_qualities:
        metric = Metric.objects.create(
            metric_name=f"{quality}_score",
            category=quality,
            value_type="numeric",
            rule="default"
        )
        ahp_metrics[quality] = metric
    
    non_ahp_qualities = [
        "Raw Metrics (Measured via git_stats)",
        "Raw Metrics (Measured via scc)",
        "Repo Metrics (Measured via GitHub)",
        "Popularity",
        "Activity",
        "Quality",
        "Performance",
        "Security",
        "Scalability"
    ]
    
    non_ahp_metrics = {}
    for quality in non_ahp_qualities:
        metric = Metric.objects.create(
            metric_name=f"{quality}_score",
            category=quality,
            value_type="numeric",
            rule="default"
        )
        non_ahp_metrics[quality] = metric
    
    for quality, metric in ahp_metrics.items():
        LibraryMetricValue.objects.create(
            library=lib_a,
            metric=metric,
            value="95"  # High score
        )
    
    for quality, metric in ahp_metrics.items():
        LibraryMetricValue.objects.create(
            library=lib_b,
            metric=metric,
            value="5"  # Low score
        )

    for quality, metric in non_ahp_metrics.items():
        LibraryMetricValue.objects.create(
            library=lib_b,
            metric=metric,
            value="100"
        )
        LibraryMetricValue.objects.create(
            library=lib_a,
            metric=metric,
            value="0"
        )
    
    all_categories = ahp_qualities + non_ahp_qualities
    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": all_categories})
    
    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]
        
        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Only AHP qualities appear in category_details
    print("\n=== Categories in response ===")
    print(f"AHP qualities: {len(ahp_qualities)}")
    print(f"Non-AHP qualities: {len(non_ahp_qualities)}")
    print(f"Actual categories in response: {list(data['category_details'].keys())}")
    
    # Verify ONLY AHP qualities are in category_details
    for quality in ahp_qualities:
        assert quality in data["category_details"], \
            f"AHP quality '{quality}' should be in category_details"
    
    for quality in non_ahp_qualities:
        assert quality not in data["category_details"], \
            f"Non-AHP quality '{quality}' should NOT be in category_details"
    
    # Verify the count matches exactly the number of AHP qualities
    assert len(data["category_details"]) == len(ahp_qualities)
    
    # Package A should rank higher than Package B
    global_ranking = data["global_ranking"]
    
    print(f"\n=== Global Ranking ===")
    print(f"PackageA: {global_ranking.get('PackageA', 0):.6f}")
    print(f"PackageB: {global_ranking.get('PackageB', 0):.6f}")
    
    assert "PackageA" in global_ranking
    assert "PackageB" in global_ranking
    assert global_ranking["PackageA"] > global_ranking["PackageB"], \
        f"PackageA ({global_ranking['PackageA']}) should rank higher than PackageB ({global_ranking['PackageB']})"
    
    # Check saved ahp_results in library
    lib_a.refresh_from_db()
    lib_b.refresh_from_db()
    
    print(f"\n=== Saved ahp_results for PackageA ===")
    print(f"category_scores: {lib_a.ahp_results.get('category_scores', {})}")
    print(f"overall_score: {lib_a.ahp_results.get('overall_score', 0)}")
    
    # Verify only AHP qualities are saved in category_scores
    for quality in ahp_qualities:
        assert quality in lib_a.ahp_results["category_scores"], \
            f"AHP quality '{quality}' should be in saved category_scores"
    
    for quality in non_ahp_qualities:
        assert quality not in lib_a.ahp_results["category_scores"], \
            f"Non-AHP quality '{quality}' should NOT be in saved category_scores"
    
    score_ratio = global_ranking["PackageA"] / global_ranking["PackageB"]
    print(f"\nScore ratio (PackageA / PackageB): {score_ratio:.2f}")
    
    # The ratio should be > 1 (Package A better) and substantial
    assert score_ratio > 1.5, \
        f"Score ratio {score_ratio:.2f} should be > 1.5 (Package A much better than Package B)"
    
    # Confirm that non-AHP metrics were NOT processed
    if "raw_scores" in data:
        for quality in non_ahp_qualities:
            assert quality not in data["raw_scores"], \
                f"Non-AHP quality '{quality}' should NOT be in raw_scores"
    
    print("\n✅ All tests passed: Non-AHP qualities were correctly filtered out!")
