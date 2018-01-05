# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-01-05 07:12
from __future__ import unicode_literals

from django.db import migrations

def execute(apps, schema_editor):
    Chart = apps.get_model('grapher_admin', 'Chart')
    for chart in Chart.objects.all():
        if chart.config.get('isPublished'):
            chart.published_at = chart.created_at
            chart.save()

class Migration(migrations.Migration):

    dependencies = [
        ('grapher_admin', '0026_auto_20180105_0706'),
    ]

    operations = [
        migrations.RunPython(execute)
    ]
