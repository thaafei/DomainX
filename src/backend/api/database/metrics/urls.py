from django.urls import path
from .views import (
    MetricListCreateView,
    MetricRetrieveUpdateDestroyView,
    MetricUpdateWeightView,
    MetricListFlatView,
    MetricRulesView,
    MetricCategoryView,
)

urlpatterns = [
    path("", MetricListCreateView.as_view(), name="metric-list-create"),
    path("<uuid:metric_id>/", MetricRetrieveUpdateDestroyView.as_view(), name="metric-detail"),
    path("<uuid:metric_id>/update-weight/", MetricUpdateWeightView.as_view(), name="metric-update-weight"),
    path("all/", MetricListFlatView.as_view(), name="metric-all-flat"),
    path("rules/", MetricRulesView.as_view(), name="metric-rules"),
    path("categories/", MetricCategoryView.as_view(), name="metric-categories"),
]
