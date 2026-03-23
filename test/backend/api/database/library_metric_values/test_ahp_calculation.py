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