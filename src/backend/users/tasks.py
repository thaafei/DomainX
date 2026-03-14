from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(queue="email")
def send_invite_email_task(to_email, subject, body):
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
    )
