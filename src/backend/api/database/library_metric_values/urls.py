from django.urls import path
from .views import (
    LibraryMetricValueCreateOrUpdateView,
    LibraryMetricTableView,
    LibraryMetricTableView,
    MetricValueBulkUpdateView
)

urlpatterns = [
    path('create-or-update/', LibraryMetricValueCreateOrUpdateView.as_view(), name='library-metric-create-update'),
    # path('get/', LibraryMetricTableView.as_view(), name='library-metric-get'),
    path('table/', LibraryMetricTableView.as_view(), name='library-metric-table'),
    path('bulk-update/', MetricValueBulkUpdateView.as_view(), name='metric-bulk-update'),
]
