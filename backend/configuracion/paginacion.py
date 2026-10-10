"""Paginación para listados que pueden crecer mucho (citas, auditoría)."""

from rest_framework.pagination import PageNumberPagination


class PaginacionEstandar(PageNumberPagination):
    page_size = 25
    page_query_param = "pagina"
    page_size_query_param = "tamano"
    max_page_size = 100
