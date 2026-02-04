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

@pytest.mark.django_db
def test_ahp_calculations_success(api_client):
    # 1. Setup Domain
    domain = Domain.objects.create(
        domain_name="AHP Test Domain", 
        category_weights={"Performance": 1.0}
    )

    # 2. Setup Metric and Library
    metric = Metric.objects.create(
        category="Performance",
        value_type="numeric",
        rule="default"
    )
    library = Library.objects.create(
        domain=domain,
        library_name="TestLib"
    )

    # 3. Assign a value to the library for that metric
    LibraryMetricValue.objects.create(
        library=library,
        metric=metric,
        value="85"
    )

    # 4. Mock the JSON files (rules.json and categories.json)
    # This prevents the test from actually needing the physical files
    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Performance"]})

    # We use a side_effect to return different content for each file open call
    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        # 5. Call the API
        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    # 6. Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["domain"] == "AHP Test Domain"
    assert "global_ranking" in data
    assert "TestLib" in data["global_ranking"]
    
    # Verify the object was actually saved in the database
    library.refresh_from_db()
    assert library.ahp_results is not None
    assert library.ahp_results["overall_score"] > 0

@pytest.mark.django_db
def test_ahp_calculations_not_found(api_client):
    # Test with a domain ID that doesn't exist (999)
    url = "/api/ahp-calculations/999/"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
def test_ahp_calculations_with_weighted_categories(api_client):
    # 1. Setup Domain with specific weights
    # Note: Performance is 4x as important as Security here
    weights = {"Performance": 0.8, "Security": 0.2}
    domain = Domain.objects.create(
        domain_name="Weighted Domain",
        category_weights=weights
    )

    # 2. Setup Metrics for both categories
    perf_metric = Metric.objects.create(
        metric_name="Performance Score",
        category="Performance", 
        value_type="numeric", 
        rule="default"
    )

    sec_metric = Metric.objects.create(
        metric_name="Security Score",
        category="Security", 
        value_type="numeric", 
        rule="default"
    )    
    
    library = Library.objects.create(domain=domain, library_name="SecureLib")

    # 3. Assign values (SecureLib is great at Security, but lower on Performance)
    LibraryMetricValue.objects.create(library=library, metric=perf_metric, value="50")
    LibraryMetricValue.objects.create(library=library, metric=sec_metric, value="100")

    # 4. Mock JSON to include BOTH categories
    mock_rules = json.dumps({"numeric": {}})
    mock_categories = json.dumps({"Categories": ["Performance", "Security"]})

    with patch("builtins.open", mock_open()) as mocked_file:
        mocked_file.side_effect = [
            mock_open(read_data=mock_rules).return_value,
            mock_open(read_data=mock_categories).return_value
        ]

        url = reverse("values-ahp", kwargs={"domain_id": domain.domain_ID})
        response = api_client.get(url)

    # 5. Assertions
    assert response.status_code == 200
    data = response.json()
    
    # Verify that the response includes details for both categories
    assert "Performance" in data["category_details"]
    assert "Security" in data["category_details"]
    
    # Check that results were saved to the library model
    library.refresh_from_db()
    assert "Performance" in library.ahp_results["category_scores"]
    assert "Security" in library.ahp_results["category_scores"]