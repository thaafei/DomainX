from django.core.management.base import BaseCommand

from api.database.metrics.models import Metric, MetricOrder


class Command(BaseCommand):
    help = "Populate MetricOrder with current metrics organized by category"

    def handle(self, *args, **options):
        try:
            # Get all metrics grouped by category
            metrics = Metric.objects.all().order_by("category", "metric_name")

            category_order = {}
            for metric in metrics:
                category = metric.category or "Uncategorized"
                if category not in category_order:
                    category_order[category] = []
                category_order[category].append(str(metric.metric_ID))

            # Get or create the MetricOrder instance
            metric_order, created = MetricOrder.objects.get_or_create(pk=1)
            metric_order.category_order = category_order
            metric_order.save()

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Created MetricOrder with {len(metrics)} metrics"
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Updated MetricOrder with {len(metrics)} metrics"
                    )
                )

            # Print summary
            self.stdout.write("\nMetrics by category:")
            for category, metric_ids in sorted(category_order.items()):
                self.stdout.write(f"  {category}: {len(metric_ids)} metrics")

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Error populating MetricOrder: {str(e)}")
            )
