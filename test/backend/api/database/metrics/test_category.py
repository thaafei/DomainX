from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from api.database.metrics.category import Category
from api.database.metrics.models import Metric

class CategoryAPITests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(
            category_name="Test Category",
            category_description="A test category."
        )

    def test_create_category(self):
        url = reverse('category-list')
        data = {
            "category_name": "New Category",
            "category_description": "New description."
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category_name"], "New Category")

    def test_list_categories(self):
        url = reverse('category-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(c["category_name"] == "Test Category" for c in response.data))

    def test_delete_category_no_metrics(self):
        url = reverse('category-delete-category', args=[str(self.category.category_ID)])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(category_ID=self.category.category_ID).exists())

    def test_delete_category_with_metrics(self):
        metric = Metric.objects.create(
            metric_name="Test Metric",
            category=self.category,
            value_type="float"
        )
        url = reverse('category-delete-category', args=[str(self.category.category_ID)])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("metrics", response.data["error"])
        self.assertTrue(Category.objects.filter(category_ID=self.category.category_ID).exists())
