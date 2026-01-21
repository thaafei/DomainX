from django.db import models
import uuid
from rest_framework import serializers, viewsets
from rest_framework.routers import DefaultRouter


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

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')