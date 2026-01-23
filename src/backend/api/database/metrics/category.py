from django.db import models
import uuid
from rest_framework import serializers, viewsets
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status


class Category(models.Model):
    category_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category_name = models.CharField(max_length=100, unique=True, null=True, blank=True, editable=True)
    category_description = models.TextField(blank=True, null=True, help_text="Optional additional description of the category name.", editable=True)

    def __str__(self):
        return self.category_name

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['category_ID', 'category_name', 'category_description']
class CategoryViewSet(viewsets.ModelViewSet):

    queryset = Category.objects.all().order_by("category_name")
    serializer_class = CategorySerializer

    @action(detail=True, methods=["delete"], url_path="delete")
    def delete_category(self, request, pk=None):
        from .models import Metric
        category = self.get_object()
        metrics_using_category = Metric.objects.filter(category=category)
        if metrics_using_category.exists():
            return Response({"error": f"Cannot delete category: [{category.category_name}] due to metrics using this category."}, status=400)
        category.delete()
        return Response(status=204)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')